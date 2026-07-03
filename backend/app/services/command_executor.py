from __future__ import annotations

from typing import Literal, Optional

from app.models.ac_state import AcState, CommandResponse
from app.services import ac_state_store, history_logger, ir_transmitter


def apply_command(
    *,
    user_id: str,
    source: Literal["manual", "schedule", "timer", "system"] = "manual",
    power: Optional[bool] = None,
    temperature: Optional[int] = None,
    mode: Optional[str] = None,
    fan: Optional[str] = None,
) -> CommandResponse:
    """
    Shared execution path for every AC command: merge the requested change
    into the last-known state, regenerate + transmit a fresh IR packet for
    the *full* resulting state (Carrier packets encode power/temp/mode/fan
    together, so a "just change fan speed" request still needs the whole
    state re-sent), persist the new state on success, and log to history
    either way.
    """
    current = ac_state_store.load_state()
    candidate = current.model_copy(
        update={
            k: v
            for k, v in {
                "power": power,
                "temperature": temperature,
                "mode": mode,
                "fan": fan,
            }.items()
            if v is not None
        }
    )

    result = ir_transmitter.send_state(candidate)

    if result.success:
        saved = ac_state_store.save_state(candidate)
        history_logger.log_command(user_id=user_id, state=saved, source=source, result="success")
        return CommandResponse(success=True, state=saved)

    history_logger.log_command(
        user_id=user_id, state=candidate, source=source, result="failure", error=result.error
    )
    # State is intentionally NOT persisted on failure — the AC never
    # received the command, so our "last known state" should stay accurate.
    return CommandResponse(success=False, state=current, message=result.error)
