from datetime import date, time
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.ac_state import AcMode, FanSpeed

RepeatRule = Literal["once", "daily", "weekdays", "weekends", "custom"]


class ScheduleAction(BaseModel):
    power: bool
    temperature: Optional[int] = Field(default=None, ge=20, le=28)
    mode: Optional[AcMode] = None
    fan: Optional[FanSpeed] = None


class ScheduleBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    enabled: bool = True
    time: time
    repeat: RepeatRule
    custom_days: list[int] = Field(default_factory=list)
    run_date: Optional[date] = None
    action: ScheduleAction

    @field_validator("custom_days")
    @classmethod
    def validate_custom_days(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("custom_days must be integers 0 (Sun) through 6 (Sat)")
        return value


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    enabled: Optional[bool] = None
    time: Optional[time] = None
    repeat: Optional[RepeatRule] = None
    custom_days: Optional[list[int]] = None
    run_date: Optional[date] = None
    action: Optional[ScheduleAction] = None


class ScheduleOut(ScheduleBase):
    id: str
    user_id: str
    last_run_at: Optional[str] = None
    created_at: str
    updated_at: str


class TimerCreate(BaseModel):
    action: Literal["turn_off", "turn_on"]
    seconds_from_now: int = Field(gt=0, le=60 * 60 * 24)
    label: str = ""


class TimerOut(BaseModel):
    id: str
    user_id: str
    label: str
    action: Literal["turn_off", "turn_on"]
    fires_at: str
    status: Literal["pending", "completed", "cancelled"]
    created_at: str
    completed_at: Optional[str] = None
