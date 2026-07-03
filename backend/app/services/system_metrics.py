"""Raspberry Pi system diagnostics: CPU/RAM/disk/temperature/WiFi/network/uptime."""

from __future__ import annotations

import re
import socket
import subprocess
import time
from typing import Optional

import psutil

from app.models.status import SystemMetrics

_BOOT_TIME = psutil.boot_time()


def _read_cpu_temperature() -> Optional[float]:
    # Standard location on Raspberry Pi OS.
    for path in ("/sys/class/thermal/thermal_zone0/temp",):
        try:
            with open(path) as f:
                millidegrees = int(f.read().strip())
                return round(millidegrees / 1000, 1)
        except (FileNotFoundError, ValueError, PermissionError):
            continue

    # Fallback: psutil's sensors API (not available on all platforms).
    try:
        temps = psutil.sensors_temperatures()
        for entries in temps.values():
            if entries:
                return round(entries[0].current, 1)
    except (AttributeError, OSError):
        pass

    return None


def _read_wifi_info() -> tuple[Optional[str], Optional[int]]:
    """Returns (ssid, signal_percent). Uses `iwconfig`, which ships on
    Raspberry Pi OS. Returns (None, None) off-Pi or if WiFi is down."""
    try:
        output = subprocess.run(
            ["iwconfig"], capture_output=True, text=True, timeout=2
        ).stdout
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return None, None

    ssid_match = re.search(r'ESSID:"([^"]*)"', output)
    ssid = ssid_match.group(1) if ssid_match else None

    quality_match = re.search(r"Link Quality=(\d+)/(\d+)", output)
    signal_percent = None
    if quality_match:
        current, maximum = int(quality_match.group(1)), int(quality_match.group(2))
        if maximum > 0:
            signal_percent = round(current / maximum * 100)

    return ssid, signal_percent


def _read_ip_address() -> Optional[str]:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(1)
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return None


def get_system_metrics() -> SystemMetrics:
    cpu_percent = psutil.cpu_percent(interval=0.2)

    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    ssid, signal_percent = _read_wifi_info()

    return SystemMetrics(
        cpu_percent=cpu_percent,
        ram_percent=mem.percent,
        ram_used_mb=round(mem.used / (1024 * 1024), 1),
        ram_total_mb=round(mem.total / (1024 * 1024), 1),
        disk_percent=disk.percent,
        disk_used_gb=round(disk.used / (1024 ** 3), 2),
        disk_total_gb=round(disk.total / (1024 ** 3), 2),
        cpu_temperature_c=_read_cpu_temperature(),
        wifi_ssid=ssid,
        wifi_signal_percent=signal_percent,
        ip_address=_read_ip_address(),
        hostname=socket.gethostname(),
        uptime_seconds=round(time.time() - _BOOT_TIME, 1),
    )
