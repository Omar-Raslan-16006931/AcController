from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.ac_state import AuxCommandResponse
from app.services import ir_transmitter

router = APIRouter(prefix="/api/aux", tags=["aux"])


@router.post("/light", response_model=AuxCommandResponse)
def toggle_light(user: CurrentUser = Depends(get_current_user)) -> AuxCommandResponse:
    """Replays the real remote's Light button. Momentary press, not a
    tracked state -- the AC unit itself remembers whether its display is
    on or off, we just replay the raw waveform captured from the remote's
    Light button each time this is pressed."""
    result = ir_transmitter.send_raw_command("light.txt", "carrier-light")
    return AuxCommandResponse(success=result.success, message=result.error)


@router.post("/self-clean", response_model=AuxCommandResponse)
def trigger_self_clean(user: CurrentUser = Depends(get_current_user)) -> AuxCommandResponse:
    """Replays the real remote's Self Clean button."""
    result = ir_transmitter.send_raw_command("self_clean.txt", "carrier-selfclean")
    return AuxCommandResponse(success=result.success, message=result.error)
