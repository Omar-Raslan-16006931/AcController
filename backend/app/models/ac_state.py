from typing import Literal, Optional

from pydantic import BaseModel, Field

AcMode = Literal["cool", "heat", "dry", "fan", "eco"]
FanSpeed = Literal["low", "medium", "high", "auto"]


class AcState(BaseModel):
    """The last commanded state of the AC. IR is one-way, so this is the
    backend's best knowledge of reality — it reflects the last successfully
    transmitted command, not a live reading from the unit."""

    power: bool
    temperature: int = Field(ge=16, le=32)
    mode: AcMode
    fan: FanSpeed
    eco: bool = False
    updated_at: str


class PowerRequest(BaseModel):
    power: bool


class TemperatureRequest(BaseModel):
    temperature: int = Field(ge=16, le=32)


class ModeRequest(BaseModel):
    mode: AcMode


class FanRequest(BaseModel):
    fan: FanSpeed


class CommandResponse(BaseModel):
    success: bool
    state: AcState
    message: Optional[str] = None
