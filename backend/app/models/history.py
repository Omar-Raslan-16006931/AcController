from typing import Literal, Optional

from pydantic import BaseModel

from app.models.ac_state import AcMode, FanSpeed


class HistoryEntry(BaseModel):
    id: str
    user_id: str
    power: bool
    temperature: Optional[int] = None
    mode: Optional[AcMode] = None
    fan: Optional[FanSpeed] = None
    source: Literal["manual", "schedule", "timer", "system"]
    result: Literal["success", "failure"]
    error: Optional[str] = None
    created_at: str


class HistoryPage(BaseModel):
    items: list[HistoryEntry]
    total: int
    limit: int
    offset: int
