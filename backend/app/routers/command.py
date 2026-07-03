from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.ac_state import CommandRequest, CommandResponse
from app.services.command_executor import apply_command

router = APIRouter(prefix="/api/command", tags=["command"])


@router.post("", response_model=CommandResponse)
def send_command(
    body: CommandRequest, user: CurrentUser = Depends(get_current_user)
) -> CommandResponse:
    """
    Combined "send now" endpoint for Automatic Send = off: the frontend
    stages power/temperature/mode/fan changes locally without transmitting,
    then posts whichever fields changed here to be merged into one IR
    transmission — same underlying apply_command() every other AC endpoint
    uses, just with multiple fields in a single call.
    """
    return apply_command(
        user_id=user.user_id,
        power=body.power,
        temperature=body.temperature,
        mode=body.mode,
        fan=body.fan,
    )
