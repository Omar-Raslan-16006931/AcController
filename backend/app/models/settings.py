from typing import Optional

from pydantic import BaseModel, Field

from app.models.ac_state import AcMode, FanSpeed


class SettingsOut(BaseModel):
    id: str
    user_id: str
    theme: str
    timezone: str
    language: str
    default_temperature: int
    default_mode: AcMode
    default_fan: FanSpeed
    created_at: str
    updated_at: str


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    default_temperature: Optional[int] = Field(default=None, ge=20, le=28)
    default_mode: Optional[AcMode] = None
    default_fan: Optional[FanSpeed] = None
