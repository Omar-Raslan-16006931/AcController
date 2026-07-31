from typing import Literal, Optional

from pydantic import BaseModel, Field


class LearnedButton(BaseModel):
    """One button captured via app/services/ac_learn.py."""

    name: str
    learned_at: str


class LearnedButtonsResponse(BaseModel):
    buttons: list[LearnedButton]


class LearnStartRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    # How long to listen before giving up if nothing arrives. Real remotes
    # respond instantly once pressed -- this is mostly slack for the user to
    # read the instructions, get the remote lined up, and press the button,
    # not for the IR burst itself.
    timeout_seconds: float = Field(default=10.0, ge=3.0, le=30.0)


LearnState = Literal["idle", "listening", "received", "timed_out", "error"]


class LearnStatus(BaseModel):
    state: LearnState
    button_name: Optional[str] = None
    started_at: Optional[str] = None
    error: Optional[str] = None


class LearnActionResponse(BaseModel):
    success: bool
    status: LearnStatus
    message: Optional[str] = None


class LearnSendRequest(BaseModel):
    name: str = Field(min_length=1)


class LearnSendResponse(BaseModel):
    success: bool
    name: str
    message: Optional[str] = None


class LearnDeleteResponse(BaseModel):
    success: bool
    name: str
