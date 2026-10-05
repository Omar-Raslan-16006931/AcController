from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Literal, Optional

from app.models.ac_state import AcState
from app.supabase_client import get_service_client

# The Pi's internet link can be slow, so writing to Supabase must never sit
# between a button press and the response. The insert runs on a background
# thread, and the latest result is kept in memory for /api/status.
_last_lock = threading.Lock()
_last_command: dict[str, dict[str, str]] = {}


def last_command(user_id: str) -> Optional[dict[str, str]]:
    """{"result": ..., "created_at": ...} of the latest command this process
    has seen for the user, or None if none since the backend started."""
    with _last_lock:
        return _last_command.get(user_id)


def _write(row: dict) -> None:
    try:
        get_service_client().table("command_history").insert(row).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[history_logger] failed to write command_history: {exc}")


def log_command(
    *,
    user_id: str,
    state: AcState,
    source: Literal["manual", "schedule", "timer", "system"],
    result: Literal["success", "failure"],
    error: Optional[str] = None,
) -> None:
    """Best-effort, non-blocking write to Supabase `command_history`. A
    logging failure never fails (or slows) the underlying AC command."""
    now = datetime.now(timezone.utc).isoformat()
    with _last_lock:
        _last_command[user_id] = {"result": result, "created_at": now}

    row = {
        "user_id": user_id,
        "power": state.power,
        "temperature": state.temperature,
        "mode": state.mode,
        "fan": state.fan,
        "source": source,
        "result": result,
        "error": error,
    }
    threading.Thread(target=_write, args=(row,), daemon=True).start()
