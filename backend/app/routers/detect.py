from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import CurrentUser, get_current_user
from app.models.detect import (
    DetectActionResponse,
    DetectCodesResponse,
    DetectConfirmResponse,
    DetectReplayResponse,
    DetectStartRequest,
    DetectStatus,
)
from app.services import ac_detector

router = APIRouter(prefix="/api/detect", tags=["detect"])


@router.get("/codes", response_model=DetectCodesResponse)
def list_codes(user: CurrentUser = Depends(get_current_user)) -> DetectCodesResponse:
    codes = ac_detector.list_codes()
    return DetectCodesResponse(codes=codes, total=len(codes))


@router.get("/status", response_model=DetectStatus)
def get_status(user: CurrentUser = Depends(get_current_user)) -> DetectStatus:
    return ac_detector.get_status()


@router.post("/start", response_model=DetectActionResponse)
def start(
    body: DetectStartRequest, user: CurrentUser = Depends(get_current_user)
) -> DetectActionResponse:
    try:
        status = ac_detector.start(start_index=body.start_index, interval_seconds=body.interval_seconds)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DetectActionResponse(success=True, status=status, message="Detection run started")


@router.post("/stop", response_model=DetectActionResponse)
def stop(user: CurrentUser = Depends(get_current_user)) -> DetectActionResponse:
    status = ac_detector.stop()
    return DetectActionResponse(success=True, status=status, message="Detection stopped")


@router.post("/reset", response_model=DetectActionResponse)
def reset(user: CurrentUser = Depends(get_current_user)) -> DetectActionResponse:
    status = ac_detector.reset()
    return DetectActionResponse(success=True, status=status, message="Detection run state cleared")


@router.post("/confirm", response_model=DetectConfirmResponse)
def confirm(user: CurrentUser = Depends(get_current_user)) -> DetectConfirmResponse:
    try:
        detected = ac_detector.confirm()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return DetectConfirmResponse(
        success=True,
        detected=detected,
        message=f"Matched {detected.brand} {detected.model} -- saved as the detected AC.",
    )


@router.post("/replay/{index}", response_model=DetectReplayResponse)
def replay(index: int, user: CurrentUser = Depends(get_current_user)) -> DetectReplayResponse:
    try:
        code = ac_detector.replay(index)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return DetectReplayResponse(
        success=True, brand=code.brand, model=code.model, message=f"Replayed {code.brand} {code.model}"
    )
