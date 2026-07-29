from typing import Literal, Optional

from pydantic import BaseModel, Field


class WifiStatus(BaseModel):
    """Mirrors whatever backend/scripts/wifi_watchdog.py last wrote to
    WIFI_STATUS_PATH, plus whether WIFI_AP_MODE_FLAG_PATH currently exists.
    Unauthenticated on purpose -- see app/routers/wifi.py's module
    docstring for why."""

    ap_mode: bool
    ap_ssid: Optional[str] = None
    mode: Optional[Literal["client", "ap", "error"]] = None
    connected_ssid: Optional[str] = None
    attempted_ssid: Optional[str] = None
    success: Optional[bool] = None
    error: Optional[str] = None
    updated_at: Optional[str] = None
    watchdog_running: bool = True


class WifiNetwork(BaseModel):
    ssid: str
    signal: int
    security: str


class WifiNetworksResponse(BaseModel):
    networks: list[WifiNetwork]
    error: Optional[str] = None


class WifiConnectRequest(BaseModel):
    ssid: str = Field(min_length=1, max_length=32)
    password: str = Field(default="", max_length=63)


class WifiConnectResponse(BaseModel):
    success: bool
    message: str
