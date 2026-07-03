from typing import Literal, Optional

from pydantic import BaseModel, Field

# Restricted to exactly what the real Carrier hardware supports, confirmed
# via IR capture analysis in carrier_ac.py (see MODE_CODES/FAN_CODES/
# TEMP_TABLE there). There is no "fan-only" mode, no confirmed "eco" bit,
# no "auto" fan speed exposed to users, and no temperature outside 20-28C.
# FastAPI/Pydantic rejects anything else with a 400 before it ever reaches
# the IR transmission layer — see the RequestValidationError handler in
# app/main.py.
AcMode = Literal["cool", "heat", "dry"]
FanSpeed = Literal["low", "medium", "high"]


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


class CommandResponse(BaseModel):
    success: bool
    state: AcState
    message: Optional[str] = None
