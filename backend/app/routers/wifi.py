"""
WiFi status/scan/connect endpoints for the fallback-hotspot setup flow.

Deliberately UNAUTHENTICATED, unlike every other router in this app: while
the Pi is in AP fallback mode there is no internet route from it to
Supabase, so the normal `get_current_user` JWT dependency straightforwardly
can't be satisfied here even by the real user. The standing risk that
opens up (anyone who can reach this port could try to reconfigure WiFi) is
closed a different way instead -- `_require_ap_mode()` makes /networks and
/connect hard-403 unless backend/scripts/wifi_watchdog.py (a separate root
process, see that file) has already decided the Pi is disconnected and
raised its own fallback hotspot. In normal day-to-day operation (Pi on home
WiFi, reachable over Tailscale/the internet) that flag is never set, so
this "unauthenticated surface" is dormant. /status is read-only and always
answers, AP mode or not -- it exposes only connectivity state, nothing
sensitive.

This router never calls nmcli directly -- see wifi_watchdog.py's docstring
for why that split exists (this process runs as the unprivileged `pi`
user; only the watchdog runs as root).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.config import get_settings
from app.models.wifi import (
    WifiConnectRequest,
    WifiConnectResponse,
    WifiNetwork,
    WifiNetworksResponse,
    WifiStatus,
)
from app.services.wifi_setup_page import PAGE

router = APIRouter(tags=["wifi"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_ap_mode() -> bool:
    return os.path.exists(get_settings().wifi_ap_mode_flag_path)


def _require_ap_mode() -> None:
    if not _is_ap_mode():
        raise HTTPException(
            status_code=403,
            detail="Not currently in WiFi setup mode. This endpoint only works while the "
            "Pi's fallback hotspot is active -- there's no route to Supabase to check a "
            "normal login from here, which is exactly the situation the hotspot exists for.",
        )


@router.get("/wifi-setup", response_class=HTMLResponse, include_in_schema=False)
def wifi_setup_page() -> str:
    return PAGE


@router.get("/api/wifi/status", response_model=WifiStatus)
def wifi_status() -> WifiStatus:
    settings = get_settings()
    ap_mode = _is_ap_mode()

    ap_ssid = None
    if ap_mode:
        try:
            with open(settings.wifi_ap_mode_flag_path, "r") as f:
                ap_ssid = json.load(f).get("ssid")
        except (json.JSONDecodeError, OSError):
            pass

    last: dict = {}
    watchdog_running = True
    if os.path.exists(settings.wifi_status_path):
        try:
            with open(settings.wifi_status_path, "r") as f:
                last = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    else:
        # wifi_watchdog.py writes this file on its very first loop
        # iteration -- if it's never shown up at all, the watchdog service
        # most likely isn't installed/running yet (see
        # docs/WIFI_FALLBACK.md), not just "hasn't found anything to report".
        watchdog_running = False

    return WifiStatus(
        ap_mode=ap_mode,
        ap_ssid=ap_ssid,
        mode=last.get("mode"),
        connected_ssid=last.get("connected_ssid"),
        attempted_ssid=last.get("attempted_ssid"),
        success=last.get("success"),
        error=last.get("error"),
        updated_at=last.get("updated_at"),
        watchdog_running=watchdog_running,
    )


# nmcli's terse (`-t`) output separates fields with `:` and escapes any
# literal `:` inside a field as `\:` -- split only on the former.
_UNESCAPED_COLON = re.compile(r"(?<!\\):")


def _parse_nmcli_wifi_list(output: str) -> list[WifiNetwork]:
    best: dict[str, WifiNetwork] = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        parts = [p.replace("\\:", ":") for p in _UNESCAPED_COLON.split(line)]
        if len(parts) < 3:
            continue
        ssid, signal_raw, security = parts[0], parts[1], parts[2]
        if not ssid:
            continue
        try:
            signal = int(signal_raw)
        except ValueError:
            signal = 0
        existing = best.get(ssid)
        if existing is None or signal > existing.signal:
            best[ssid] = WifiNetwork(ssid=ssid, signal=signal, security=security or "open")
    return sorted(best.values(), key=lambda n: n.signal, reverse=True)


@router.get("/api/wifi/networks", response_model=WifiNetworksResponse)
def wifi_networks() -> WifiNetworksResponse:
    _require_ap_mode()
    try:
        proc = subprocess.run(
            ["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list", "--rescan", "yes"],
            capture_output=True,
            text=True,
            timeout=20,
        )
    except FileNotFoundError:
        return WifiNetworksResponse(networks=[], error="nmcli not found on this system")
    except subprocess.TimeoutExpired:
        return WifiNetworksResponse(networks=[], error="Scan timed out")

    if proc.returncode != 0:
        return WifiNetworksResponse(networks=[], error=proc.stderr.strip() or "nmcli scan failed")

    return WifiNetworksResponse(networks=_parse_nmcli_wifi_list(proc.stdout))


@router.post("/api/wifi/connect", response_model=WifiConnectResponse)
def wifi_connect(body: WifiConnectRequest) -> WifiConnectResponse:
    _require_ap_mode()
    settings = get_settings()
    path = settings.wifi_pending_path

    try:
        directory = os.path.dirname(os.path.abspath(path)) or "."
        os.makedirs(directory, exist_ok=True)
        tmp_path = path + ".tmp"
        with open(tmp_path, "w") as f:
            json.dump({"ssid": body.ssid, "password": body.password, "requested_at": _now_iso()}, f)
        os.replace(tmp_path, path)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not queue connection request: {exc}") from exc

    return WifiConnectResponse(
        success=True,
        message="Queued -- the Pi will attempt this network within about 15 seconds. "
        "Watch this page, or poll GET /api/wifi/status, for the result.",
    )
