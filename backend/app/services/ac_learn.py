"""
Manual IR "learning" -- capture buttons directly from a real physical
remote via an IR RECEIVER wired to the Pi, for an AC whose brand/protocol
isn't in the bundled Flipper-IRDB set at all (see ac_detector.py /
ac_remote_control.py), or to add a button the community capture is
missing.

Requires separate receive hardware from the existing transmit blaster: an
IR receiver module (e.g. a TSOP38238) wired to its own GPIO pin with the
plain `gpio-ir` device-tree overlay (NOT `gpio-ir-tx`, which is
transmit-only and is what the existing blaster already uses). See
docs/AC_LEARN.md for wiring + config.txt steps. Settings.ir_rx_device
points at that separate lirc device (typically /dev/lirc1, distinct from
Settings.ir_device/lirc0 used for sending).

`ir-ctl --receive=<file>` doesn't stop on its own after one button press
-- it keeps listening and appending until killed. So this module runs it
as a background subprocess and polls the output file's size: once it
stops growing for ~400ms (the burst finished) the process is terminated
and the capture is kept; if nothing arrives before `timeout_seconds`, it's
terminated with nothing captured and the caller is told plainly that no
signal was received -- exactly the per-button "did the Pi actually see
anything" check the learning UI needs, not just a is IR blindly assumed.

Each learned button is one raw "+mark -space" .txt file (same ir-ctl text
format used everywhere else in this project -- base.txt, power_off.txt,
the brute-force/full_signals captures), stored under
Settings.learned_signals_dir with a manifest.json (name -> file/
learned_at) so they persist across restarts and can be sent the same way
ac_remote_control.send_signal() sends a bundled community button.

Single global listen session at a time and a threading.Lock-guarded
module-level state dataclass, same pattern as ac_detector.py -- this is a
household appliance controller for one person teaching one remote to one
Pi, not a multi-tenant service.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.config import get_settings
from app.services import ir_transmitter

# How long the capture file's size must stay unchanged before we treat the
# burst as "finished" and stop listening early instead of waiting out the
# full timeout. Real IR bursts write in well under 100ms; 400ms gives a
# comfortable margin for slow disk flushes without making every capture
# feel sluggish.
_SETTLE_SECONDS = 0.4
_POLL_INTERVAL_SECONDS = 0.1


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_name(name: str) -> str:
    """Light validation/trim for the human-facing button name -- kept
    mostly as typed (so "Cool 22°" stays readable in the UI), just
    collapsed whitespace and rejecting empty/whitespace-only input."""
    cleaned = re.sub(r"\s+", " ", name.strip())
    if not cleaned:
        raise ValueError("Button name can't be empty")
    if len(cleaned) > 40:
        raise ValueError("Button name is too long (40 characters max)")
    return cleaned


def _slug(name: str) -> str:
    """Filesystem-safe version of the name, for the .txt filename only --
    the manifest keeps the original display name."""
    s = re.sub(r"[^A-Za-z0-9_.-]+", "_", name.strip())
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "button"


@dataclass
class _ListenState:
    # idle | listening | received | timed_out | error
    state: str = "idle"
    button_name: str | None = None
    started_at: str | None = None
    error: str | None = None
    stop_event: threading.Event = field(default_factory=threading.Event)


_lock = threading.Lock()
_listen = _ListenState()


def _manifest_path() -> str:
    settings = get_settings()
    return os.path.join(settings.learned_signals_dir, "manifest.json")


def _load_manifest() -> list[dict]:
    path = _manifest_path()
    if not os.path.isfile(path):
        return []
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_manifest(entries: list[dict]) -> None:
    settings = get_settings()
    directory = settings.learned_signals_dir
    os.makedirs(directory, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".manifest_", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(entries, f, indent=2)
        os.replace(tmp_path, _manifest_path())
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def list_buttons() -> list[dict]:
    """Every learned button, alphabetical by name -- each dict has
    name/file/learned_at."""
    return sorted(_load_manifest(), key=lambda e: e["name"].lower())


def delete_button(name: str) -> None:
    entries = _load_manifest()
    match = next((e for e in entries if e["name"] == name), None)
    if match is None:
        raise LookupError(f"No learned button named {name!r}")

    settings = get_settings()
    path = os.path.join(settings.learned_signals_dir, match["file"])
    if os.path.isfile(path):
        os.remove(path)
    _save_manifest([e for e in entries if e["name"] != name])


def get_listen_status() -> dict:
    with _lock:
        return {
            "state": _listen.state,
            "button_name": _listen.button_name,
            "started_at": _listen.started_at,
            "error": _listen.error,
        }


def _save_capture(button_name: str, tmp_path: str) -> None:
    """Moves a finished temp capture into learned_signals_dir and records
    it in the manifest, overwriting any earlier capture of the same
    button name (re-learning a button replaces it, doesn't duplicate)."""
    settings = get_settings()
    directory = settings.learned_signals_dir
    os.makedirs(directory, exist_ok=True)

    entries = _load_manifest()
    old = next((e for e in entries if e["name"] == button_name), None)

    filename = f"{_slug(button_name)}-{uuid.uuid4().hex[:8]}.txt"
    dest = os.path.join(directory, filename)
    os.replace(tmp_path, dest)

    if old is not None:
        old_path = os.path.join(directory, old["file"])
        if os.path.isfile(old_path):
            os.remove(old_path)

    entries = [e for e in entries if e["name"] != button_name]
    entries.append({"name": button_name, "file": filename, "learned_at": _now_iso()})
    _save_manifest(entries)


def _capture_worker(
    button_name: str, tmp_path: str, timeout_seconds: float, stop_event: threading.Event
) -> None:
    settings = get_settings()

    if settings.simulate_ir:
        # Dev/no-receiver mode: pretend a signal arrives partway through the
        # window, so the full listen -> received -> saved flow (and the
        # frontend built around it) is exercisable without real hardware.
        time.sleep(min(1.5, timeout_seconds / 2))
        if stop_event.is_set():
            return
        with open(tmp_path, "w") as f:
            f.write("+9000 -4500 +560 -560 +560 -1690 +560 -39000\n")
        with _lock:
            if _listen.button_name == button_name:
                _listen.state = "received"
        _save_capture(button_name, tmp_path)
        return

    try:
        proc = subprocess.Popen(
            ["ir-ctl", "-d", settings.ir_rx_device, f"--receive={tmp_path}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError:
        with _lock:
            if _listen.button_name == button_name:
                _listen.state = "error"
                _listen.error = "ir-ctl not found on this system. Install v4l-utils."
        return

    deadline = time.monotonic() + timeout_seconds
    last_size = 0
    stable_since: float | None = None

    while time.monotonic() < deadline:
        if stop_event.is_set():
            proc.terminate()
            return

        size = os.path.getsize(tmp_path) if os.path.exists(tmp_path) else 0
        if size > 0:
            if size == last_size:
                if stable_since is None:
                    stable_since = time.monotonic()
                elif time.monotonic() - stable_since >= _SETTLE_SECONDS:
                    break
            else:
                stable_since = None
            last_size = size

        time.sleep(_POLL_INTERVAL_SECONDS)

    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()

    stderr = ""
    if proc.stderr is not None:
        try:
            stderr = proc.stderr.read() or ""
        except Exception:  # noqa: BLE001 - best-effort diagnostics only
            pass

    received = os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0

    with _lock:
        if stop_event.is_set() or _listen.button_name != button_name:
            return
        if received:
            _listen.state = "received"
        else:
            _listen.state = "timed_out"
            # ir-ctl exiting with device errors (wrong path, no rx overlay
            # loaded, permission denied) looks identical to "no button was
            # pressed" from the outside -- surface stderr so it's obvious
            # which one actually happened instead of just "try again".
            if stderr.strip():
                _listen.error = stderr.strip()

    if received:
        _save_capture(button_name, tmp_path)
    elif os.path.exists(tmp_path):
        os.remove(tmp_path)


def start_listening(name: str, timeout_seconds: float = 10.0) -> dict:
    clean_name = _clean_name(name)

    with _lock:
        if _listen.state == "listening":
            raise RuntimeError("Already listening for a button -- cancel it first")

        settings = get_settings()
        os.makedirs(settings.ir_files_dir, exist_ok=True)
        tmp_path = os.path.join(settings.ir_files_dir, f".learn-{uuid.uuid4().hex}.txt")
        open(tmp_path, "w").close()  # ensure it exists so getsize() never raises

        _listen.state = "listening"
        _listen.button_name = clean_name
        _listen.started_at = _now_iso()
        _listen.error = None
        _listen.stop_event = threading.Event()
        stop_event = _listen.stop_event

        thread = threading.Thread(
            target=_capture_worker,
            args=(clean_name, tmp_path, timeout_seconds, stop_event),
            daemon=True,
        )
        thread.start()

    return get_listen_status()


def cancel_listening() -> dict:
    with _lock:
        if _listen.state == "listening":
            _listen.stop_event.set()
            _listen.state = "idle"
            _listen.button_name = None
    return get_listen_status()


def send_learned(name: str) -> ir_transmitter.TransmitResult:
    entries = _load_manifest()
    match = next((e for e in entries if e["name"] == name), None)
    if match is None:
        raise LookupError(f"No learned button named {name!r}")

    settings = get_settings()
    path = os.path.join(settings.learned_signals_dir, match["file"])
    return ir_transmitter.transmit_raw_file(path)
