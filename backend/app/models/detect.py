from typing import Literal, Optional

from pydantic import BaseModel, Field


class DetectCode(BaseModel):
    """One entry from raw/ac_codes/brute_force/manifest.json."""

    index: int
    brand: str
    model: str


class DetectCodesResponse(BaseModel):
    codes: list[DetectCode]
    total: int


class DetectStartRequest(BaseModel):
    # Time between codes. Real remotes' "on" beep is near-instant, so this
    # mostly needs to be long enough for the user to register the sound and
    # react — 1.5s default gives a comfortable margin without making a full
    # 116-code pass (~3min) drag on unnecessarily. Bounded to keep someone
    # from setting 0 (codes step on each other / IR transmitter has no
    # queue) or an unreasonably long per-code wait.
    interval_seconds: float = Field(default=1.5, ge=0.5, le=10.0)
    # Resume from a specific point instead of the beginning -- e.g. after a
    # stop, or to skip brands already ruled out.
    start_index: int = Field(default=0, ge=0)


DetectState = Literal["idle", "running", "finished", "confirmed"]


class DetectStatus(BaseModel):
    state: DetectState
    current_index: Optional[int] = None
    current_brand: Optional[str] = None
    current_model: Optional[str] = None
    sent_count: int
    total: int
    interval_seconds: float
    started_at: Optional[str] = None
    last_error: Optional[str] = None
    detected: Optional["DetectedAc"] = None


class DetectActionResponse(BaseModel):
    success: bool
    status: DetectStatus
    message: Optional[str] = None


class DetectedAc(BaseModel):
    """Persisted result of a confirmed brute-force match -- see
    app/services/ac_detector.py's DETECTED_FILE."""

    brand: str
    model: str
    index: int
    file: str
    confirmed_at: str


class DetectConfirmResponse(BaseModel):
    success: bool
    detected: Optional[DetectedAc] = None
    message: Optional[str] = None


class DetectReplayResponse(BaseModel):
    success: bool
    brand: str
    model: str
    message: Optional[str] = None


class DetectSignal(BaseModel):
    """One button captured for the confirmed AC's model -- see
    app/services/ac_remote_control.py. `category` is a best-effort guess
    (power/temperature/mode/fan/swing/light/sleep/boost/other) for
    grouping in the UI, not a guarantee."""

    name: str
    label: str
    category: str


class DetectSignalsResponse(BaseModel):
    detected: DetectedAc
    signals: list[DetectSignal]


class DetectSendSignalRequest(BaseModel):
    name: str = Field(min_length=1)


class DetectSendSignalResponse(BaseModel):
    success: bool
    name: str
    message: Optional[str] = None
