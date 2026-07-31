from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import CurrentUser, get_current_user
from app.models.learn import (
    LearnActionResponse,
    LearnDeleteResponse,
    LearnedButtonsResponse,
    LearnSendRequest,
    LearnSendResponse,
    LearnStartRequest,
    LearnStatus,
)
from app.services import ac_learn

router = APIRouter(prefix="/api/learn", tags=["learn"])


@router.get("/buttons", response_model=LearnedButtonsResponse)
def list_buttons(user: CurrentUser = Depends(get_current_user)) -> LearnedButtonsResponse:
    return LearnedButtonsResponse(buttons=ac_learn.list_buttons())


@router.get("/status", response_model=LearnStatus)
def get_status(user: CurrentUser = Depends(get_current_user)) -> LearnStatus:
    return LearnStatus(**ac_learn.get_listen_status())


@router.post("/start", response_model=LearnActionResponse)
def start(
    body: LearnStartRequest, user: CurrentUser = Depends(get_current_user)
) -> LearnActionResponse:
    try:
        status = ac_learn.start_listening(body.name, timeout_seconds=body.timeout_seconds)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return LearnActionResponse(
        success=True,
        status=LearnStatus(**status),
        message=f"Listening for '{body.name}' -- point the remote at the Pi and press it now.",
    )


@router.post("/cancel", response_model=LearnActionResponse)
def cancel(user: CurrentUser = Depends(get_current_user)) -> LearnActionResponse:
    status = ac_learn.cancel_listening()
    return LearnActionResponse(success=True, status=LearnStatus(**status), message="Listening cancelled")


@router.post("/send", response_model=LearnSendResponse)
def send(
    body: LearnSendRequest, user: CurrentUser = Depends(get_current_user)
) -> LearnSendResponse:
    try:
        result = ac_learn.send_learned(body.name)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not result.success:
        raise HTTPException(status_code=502, detail=result.error or "IR transmit failed")

    return LearnSendResponse(success=True, name=body.name, message=f"Sent {body.name}")


@router.delete("/buttons/{name}", response_model=LearnDeleteResponse)
def delete(name: str, user: CurrentUser = Depends(get_current_user)) -> LearnDeleteResponse:
    try:
        ac_learn.delete_button(unquote(name))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return LearnDeleteResponse(success=True, name=name)
