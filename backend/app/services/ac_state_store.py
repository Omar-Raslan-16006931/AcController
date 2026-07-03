"""
Persists the backend's last-known AC state to a local JSON file so it
survives a `systemctl restart ac-controller` or a Pi reboot. IR is one-way
(no feedback from the unit), so this file *is* the source of truth for
"what did we last tell the AC to do".
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from app.config import get_settings
from app.models.ac_state import AcState

_lock = Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_state() -> AcState:
    # Fallback before any command has ever been sent. Per-user preferred
    # defaults (from the Supabase `settings` table) are applied by the
    # `/api/power` "turn on" flow, not here — this is just a safe bootstrap
    # value so `load_state()` always returns something valid.
    return AcState(
        power=False,
        temperature=24,
        mode="cool",
        fan="auto",
        eco=False,
        updated_at=_now_iso(),
    )


def load_state() -> AcState:
    settings = get_settings()
    path = settings.state_file_path

    if not os.path.exists(path):
        return _default_state()

    try:
        with open(path, "r") as f:
            data = json.load(f)
        return AcState(**data)
    except (json.JSONDecodeError, ValueError, OSError):
        return _default_state()


def save_state(state: AcState) -> AcState:
    settings = get_settings()
    path = settings.state_file_path
    state.updated_at = _now_iso()

    with _lock:
        directory = os.path.dirname(os.path.abspath(path)) or "."
        os.makedirs(directory, exist_ok=True)
        # Write atomically so a crash mid-write never corrupts the state file.
        fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".ac_state_", suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                f.write(state.model_dump_json())
            os.replace(tmp_path, path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    return state


def update_state(
    *,
    power: Optional[bool] = None,
    temperature: Optional[int] = None,
    mode: Optional[str] = None,
    fan: Optional[str] = None,
    eco: Optional[bool] = None,
) -> AcState:
    current = load_state()
    merged = current.model_copy(
        update={
            k: v
            for k, v in {
                "power": power,
                "temperature": temperature,
                "mode": mode,
                "fan": fan,
                "eco": eco,
            }.items()
            if v is not None
        }
    )
    return save_state(merged)
