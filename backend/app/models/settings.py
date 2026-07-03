from typing import Optional

from pydantic import BaseModel, Field

from app.models.ac_state import AcMode, FanSpeed


class SettingsOut(BaseModel):
    id: str
    user_id: str
    theme: str
    timezone: str
    language: str
    carrier_frequency: int
    duty_cycle: float
    gpio_pin: int
    default_temperature: int
    default_mode: AcMode
    default_fan: FanSpeed
    created_at: str
    updated_at: str


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    carrier_frequency: Optional[int] = Field(default=None, ge=30000, le=56000)
    duty_cycle: Optional[float] = Field(default=None, gt=0, le=1)
    gpio_pin: Optional[int] = Field(default=None, ge=0, le=27)
    default_temperature: Optional[int] = Field(default=None, ge=16, le=32)
    default_mode: Optional[AcMode] = None
    default_fan: Optional[FanSpeed] = None
