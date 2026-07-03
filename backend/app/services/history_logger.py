from __future__ import annotations

from typing import Literal, Optional

from app.models.ac_state import AcState
from app.supabase_client import get_service_client


def log_command(
    *,
    user_id: str,
    state: AcState,
    source: Literal["manual", "schedule", "timer", "system"],
    result: Literal["success", "failure"],
    error: Optional[str] = None,
) -> None:
    """Best-effort write to Supabase `command_history`. A logging failure
    should never fail the underlying AC command, so errors are swallowed
    (and printed) rather than raised."""
    try:
        client = get_service_client()
        client.table("command_history").insert(
            {
                "user_id": user_id,
                "power": state.power,
                "temperature": state.temperature,
                "mode": state.mode,
                "fan": state.fan,
                "source": source,
                "result": result,
                "error": error,
            }
        ).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[history_logger] failed to write command_history: {exc}")
