from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

# Restricted to exactly what the real Carrier hardware supports, confirmed
# via IR capture analysis in carrier_ac.py (see MODE_CODES/FAN_CODES/
# TEMP_TABLE there). There is no "fan-only" mode, no "auto" fan speed
# exposed to users, and no temperature outside 20-28C. FastAPI/Pydantic
# rejects anything else with a 400 before it ever reaches the IR
# transmission layer — see the RequestValidationError handler in
# app/main.py. "eco" is a confirmed 5th fan-speed bitmask value (see
# carrier_ac.py's FAN_CODES + module docstring for the capture evidence).
AcMode = Literal["cool", "heat", "dry"]
FanSpeed = Literal["eco", "low", "medium", "high"]


class AcState(BaseModel):
    """The last commanded state of the AC. IR is one-way, so this is the
    backend's best knowledge of reality — it reflects the last successfully
    transmitted command, not a live reading from the unit."""

    power: bool
    temperature: int = Field(ge=20, le=28)
    mode: AcMode
    fan: FanSpeed
    updated_at: str


class PowerRequest(BaseModel):
    power: bool


class TemperatureRequest(BaseModel):
    temperature: int = Field(ge=20, le=28)


class ModeRequest(BaseModel):
    mode: AcMode


class FanRequest(BaseModel):
    fan: FanSpeed


class CommandRequest(BaseModel):
    """Combined command used for a single "send now" transmission covering
    whichever fields the user changed while Automatic Send was off — e.g.
    temperature + mode + fan adjusted locally, then sent as one IR packet
    instead of one per change."""

    power: Optional[bool] = None
    temperature: Optional[int] = Field(default=None, ge=20, le=28)
    mode: Optional[AcMode] = None
    fan: Optional[FanSpeed] = None

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "CommandRequest":
        if self.power is None and self.temperature is None and self.mode is None and self.fan is None:
            raise ValueError("At least one of power, temperature, mode, or fan is required")
        return self


class CommandResponse(BaseModel):
    success: bool
    state: AcState
    message: Optional[str] = None
