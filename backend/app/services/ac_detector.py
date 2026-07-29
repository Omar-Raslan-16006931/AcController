"""
Brute-force AC brand/protocol detector.

For a Carrier unit the normal command_executor/CarrierAC path already knows
exactly what to send. This module is for the opposite situation: an AC
whose brand/protocol is unknown (e.g. a hotel/rental unit encountered while
travelling with the Pi + IR blaster). It cycles through
raw/ac_codes/brute_force/ -- one real captured "power on"-ish waveform per
brand/model, sourced from Flipper-IRDB (see that directory's NOTICE.md) --
transmitting one every `interval_seconds`, so the user can listen for the
target AC's beep/response and tap "confirm" once they hear it. Whatever was
most recently sent at that moment is recorded as the match.

Single global run at a time (this is a household appliance controller for
one person pointing one IR blaster at one AC, not a multi-tenant service),
guarded by _lock exactly like ac_state_store's atomic-write lock.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.config import get_settings
from app.models.detect import DetectCode, DetectedAc, DetectStatus
from app.services import ir_transmitter

BRUTE_FORCE_DIR = os.path.join(os.path.dirname(__file__), "raw", "ac_codes", "brute_force")
MANIFEST_PATH = os.path.join(BRUTE_FORCE_DIR, "manifest.json")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_manifest() -> list[DetectCode]:
    with open(MANIFEST_PATH, "r") as f:
        raw = json.load(f)
    return [DetectCode(index=e["index"], brand=e["brand"], model=e["model"]) for e in raw]


def _load_manifest_raw() -> dict[int, dict]:
    """Keyed by index, keeping the `file`/`signal` fields DetectCode drops."""
    with open(MANIFEST_PATH, "r") as f:
        raw = json.load(f)
    return {e["index"]: e for e in raw}


_MANIFEST = _load_manifest()
_MANIFEST_RAW = _load_manifest_raw()


@dataclass
class _RunState:
    state: str = "idle"  # idle | running | finished | confirmed
    current_index: int | None = None
    sent_count: int = 0
    interval_seconds: float = 1.5
    started_at: str | None = None
    last_error: str | None = None
    thread: threading.Thread | None = None
    stop_event: threading.Event = field(default_factory=threading.Event)


_lock = threading.Lock()
_run = _RunState()


def _entry_for(index: int) -> dict:
    entry = _MANIFEST_RAW.get(index)
    if entry is None:
        raise ValueError(f"No brute-force code at index {index} (0-{len(_MANIFEST) - 1})")
    return entry


def _code_path(entry: dict) -> str:
    return os.path.join(BRUTE_FORCE_DIR, entry["file"])


def list_codes() -> list[DetectCode]:
    return list(_MANIFEST)


def _load_detected() -> DetectedAc | None:
    settings = get_settings()
    path = settings.detected_ac_file_path
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            return DetectedAc(**json.load(f))
    except (json.JSONDecodeError, ValueError, OSError):
        return None


def _save_detected(detected: DetectedAc) -> None:
    settings = get_settings()
    path = settings.detected_ac_file_path
    directory = os.path.dirname(os.path.abspath(path)) or "."
    os.makedirs(directory, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".detected_ac_", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(detected.model_dump_json())
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def get_status() -> DetectStatus:
    with _lock:
        current = _MANIFEST_RAW.get(_run.current_index) if _run.current_index is not None else None
        return DetectStatus(
            state=_run.state,  # type: ignore[arg-type]
            current_index=_run.current_index,
            current_brand=current["brand"] if current else None,
            current_model=current["model"] if current else None,
            sent_count=_run.sent_count,
            total=len(_MANIFEST),
            interval_seconds=_run.interval_seconds,
            started_at=_run.started_at,
            last_error=_run.last_error,
            detected=_load_detected(),
        )


def _worker(start_index: int, interval_seconds: float, stop_event: threading.Event) -> None:
    total = len(_MANIFEST)
    for index in range(start_index, total):
        if stop_event.is_set():
            return

        entry = _entry_for(index)
        with _lock:
            _run.current_index = index

        result = ir_transmitter.transmit_raw_file(_code_path(entry))

        with _lock:
            _run.sent_count += 1
            if not result.success:
                # Don't abort the whole pass over one bad transmit (e.g. a
                # single malformed capture) -- record it and keep going so
                # one brand's file can't block detecting every other one.
                _run.last_error = f"{entry['brand']} {entry['model']}: {result.error}"

        if stop_event.wait(interval_seconds):
            return  # stop_event was set during the wait

    # Reached the end of the list without a confirm/stop.
    with _lock:
        if _run.state == "running":
            _run.state = "finished"


def start(start_index: int = 0, interval_seconds: float = 1.5) -> DetectStatus:
    with _lock:
        if _run.state == "running":
            raise RuntimeError("A detection run is already in progress -- stop or confirm it first")
        if start_index >= len(_MANIFEST):
            raise ValueError(f"start_index {start_index} is past the end of the {len(_MANIFEST)}-code list")

        _run.state = "running"
        _run.current_index = None
        _run.sent_count = 0
        _run.interval_seconds = interval_seconds
        _run.started_at = _now_iso()
        _run.last_error = None
        _run.stop_event = threading.Event()

        thread = threading.Thread(
            target=_worker,
            args=(start_index, interval_seconds, _run.stop_event),
            daemon=True,
        )
        _run.thread = thread
        thread.start()

    return get_status()


def stop() -> DetectStatus:
    with _lock:
        if _run.state == "running":
            _run.stop_event.set()
            _run.state = "idle"
    return get_status()


def confirm() -> DetectedAc:
    """Stops the run (if any) and records whatever code was most recently
    sent as the match. Safe to call after the run already finished/stopped
    too -- it just uses the last `current_index` that was ever set."""
    with _lock:
        _run.stop_event.set()
        index = _run.current_index
        if index is None:
            raise RuntimeError("No code has been sent yet this run -- start detection first")

        entry = _entry_for(index)
        _run.state = "confirmed"

    detected = DetectedAc(
        brand=entry["brand"],
        model=entry["model"],
        index=index,
        file=entry["file"],
        confirmed_at=_now_iso(),
    )
    _save_detected(detected)
    return detected


def replay(index: int) -> DetectCode:
    """Manually re-sends one specific code -- e.g. to double-check a match,
    or step through candidates one at a time instead of the timed auto-run.
    Refuses to run concurrently with an active auto-detect pass."""
    with _lock:
        if _run.state == "running":
            raise RuntimeError("A detection run is in progress -- stop it before replaying a single code")
        entry = _entry_for(index)
        _run.current_index = index

    result = ir_transmitter.transmit_raw_file(_code_path(entry))
    if not result.success:
        raise RuntimeError(result.error or "IR transmit failed")

    return DetectCode(index=index, brand=entry["brand"], model=entry["model"])


def reset() -> DetectStatus:
    """Clears run state back to idle without touching a previously
    persisted detected_ac.json -- use POST /api/detect/start to begin a
    fresh pass instead if you also want to forget the last confirmed match."""
    with _lock:
        if _run.state == "running":
            _run.stop_event.set()
        _run.state = "idle"
        _run.current_index = None
        _run.sent_count = 0
        _run.last_error = None
        _run.started_at = None
    return get_status()
