from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.ac_state import CommandResponse, TemperatureRequest
from app.services.command_executor import apply_command

router = APIRouter(prefix="/api/temperature", tags=["temperature"])


@router.post("", response_model=CommandResponse)
def set_temperature(
    body: TemperatureRequest, user: CurrentUser = Depends(get_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, temperature=body.temperature)
