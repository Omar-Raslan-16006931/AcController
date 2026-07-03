from typing import Optional

from pydantic import BaseModel

from app.models.ac_state import AcState


class SystemMetrics(BaseModel):
    cpu_percent: float
    ram_percent: float
    ram_used_mb: float
    ram_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    cpu_temperature_c: Optional[float]
    wifi_ssid: Optional[str]
    wifi_signal_percent: Optional[int]
    ip_address: Optional[str]
    hostname: str
    uptime_seconds: float


class StatusResponse(BaseModel):
    online: bool
    ac_state: AcState
    system: SystemMetrics
    last_command_result: Optional[str] = None
    last_command_at: Optional[str] = None
