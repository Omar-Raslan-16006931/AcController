from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.ac_state import CommandResponse, FanRequest
from app.services.command_executor import apply_command

router = APIRouter(prefix="/api/fan", tags=["fan"])


@router.post("", response_model=CommandResponse)
def set_fan(
    body: FanRequest, user: CurrentUser = Depends(get_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, fan=body.fan)
