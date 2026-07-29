#!/usr/bin/env python3
"""
WiFi connectivity watchdog + hotspot fallback for the AcController Pi.

Runs as its OWN root systemd service (ac-controller-wifi-watchdog.service),
completely separate from the FastAPI app (which stays running as the
unprivileged `pi` user throughout). Deliberately stdlib-only — no venv, no
pip install, nothing that can break independently of the app it's there to
recover from network trouble for. It is the ONLY thing on this Pi that ever
runs `nmcli` to change network state; the FastAPI app (app/routers/wifi.py)
only ever reads/writes the three small files below.

Behavior, every CHECK_INTERVAL seconds:
  1. If a pending-credentials file exists (written by
     POST /api/wifi/connect), try connecting to it. Delete the file either
     way, and write the outcome to the status file. Success tears the
     hotspot down; failure leaves it running so the person can retry from
     the same setup page.
  2. Otherwise, check whether the WiFi interface is actually connected
     (and not just to our own fallback hotspot).
       - Connected normally: make sure the AP flag is cleared, update the
         status file, done.
       - Currently in hotspot mode: every AP_RETRY_INTERVAL, try
         reconnecting to a known network in case it's back in range (e.g.
         you're back at a location you've used before) — if that works,
         tear the hotspot down; if not, stay in hotspot mode.
       - Neither: start a "disconnected" grace timer. Once it's been
         disconnected for DISCONNECTED_GRACE seconds straight, bring up
         the fallback hotspot so you can get back in via the setup page.

Config: WIFI_AP_SSID / WIFI_AP_PASSWORD / WIFI_INTERFACE are read straight
out of backend/.env (simple line parsing, not python-dotenv — kept
dependency-free on purpose). The three state file paths must match
WIFI_AP_MODE_FLAG_PATH / WIFI_PENDING_PATH / WIFI_STATUS_PATH in that same
.env (see app/config.py) since app/routers/wifi.py reads/writes the exact
same paths.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

BACKEND_DIR = os.environ.get("AC_CONTROLLER_BACKEND_DIR", "/home/pi/AcController/backend")
ENV_PATH = os.path.join(BACKEND_DIR, ".env")

AP_FLAG_PATH = os.path.join(BACKEND_DIR, ".wifi_ap_mode")
PENDING_PATH = os.path.join(BACKEND_DIR, ".wifi_pending.json")
STATUS_PATH = os.path.join(BACKEND_DIR, ".wifi_last_result.json")

HOTSPOT_CONNECTION_NAME = "Hotspot"  # nmcli's default name for `device wifi hotspot`

CHECK_INTERVAL = 15  # seconds between connectivity checks
DISCONNECTED_GRACE = 90  # seconds of continuous disconnection before AP fallback kicks in
AP_RETRY_INTERVAL = 300  # while in AP mode, how often to retry known networks
NMCLI_TIMEOUT = 30


def log(msg: str) -> None:
    print(f"[wifi-watchdog] {msg}", flush=True)


def read_env_config() -> tuple[str, str, str]:
    ssid, password, ifname = "AcController-Setup", "change-this-password", "wlan0"
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                value = value.strip().strip('"').strip("'")
                if key == "WIFI_AP_SSID" and value:
                    ssid = value
                elif key == "WIFI_AP_PASSWORD" and value:
                    password = value
                elif key == "WIFI_INTERFACE" and value:
                    ifname = value
    return ssid, password, ifname


def run(cmd: list[str], timeout: int = NMCLI_TIMEOUT) -> tuple[bool, str, str]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return proc.returncode == 0, proc.stdout.strip(), proc.stderr.strip()
    except FileNotFoundError as exc:
        return False, "", f"nmcli not found: {exc}"
    except subprocess.TimeoutExpired:
        return False, "", f"{' '.join(cmd)} timed out after {timeout}s"


def device_status(ifname: str) -> tuple[str, str]:
    """Returns (state, connection_name) for `ifname`, e.g. ('connected',
    'HomeWiFi') or ('disconnected', '')."""
    ok, out, _ = run(["nmcli", "-t", "-f", "DEVICE,STATE,CONNECTION", "device", "status"], timeout=15)
    if not ok:
        return "unknown", ""
    for line in out.splitlines():
        parts = line.split(":")
        if len(parts) >= 3 and parts[0] == ifname:
            return parts[1], parts[2]
    return "unknown", ""


def write_status(**fields) -> None:
    data = {"updated_at": datetime.now(timezone.utc).isoformat(), **fields}
    tmp = STATUS_PATH + ".tmp"
    try:
        with open(tmp, "w") as f:
            json.dump(data, f)
        os.replace(tmp, STATUS_PATH)
    except OSError as exc:
        log(f"failed to write status file: {exc}")


def set_ap_flag(active: bool, ssid: str | None = None) -> None:
    if active:
        try:
            with open(AP_FLAG_PATH, "w") as f:
                json.dump({"ssid": ssid, "since": datetime.now(timezone.utc).isoformat()}, f)
        except OSError as exc:
            log(f"failed to write AP flag: {exc}")
    elif os.path.exists(AP_FLAG_PATH):
        os.remove(AP_FLAG_PATH)


def start_hotspot(ifname: str, ssid: str, password: str) -> tuple[bool, str]:
    log(f"bringing up fallback hotspot '{ssid}' on {ifname}")
    ok, _, err = run(
        ["nmcli", "device", "wifi", "hotspot", "ifname", ifname, "ssid", ssid, "password", password]
    )
    if ok:
        set_ap_flag(True, ssid)
        log("hotspot is up")
    else:
        log(f"failed to start hotspot: {err}")
    return ok, err


def stop_hotspot() -> None:
    log("tearing down fallback hotspot")
    run(["nmcli", "connection", "down", HOTSPOT_CONNECTION_NAME], timeout=15)
    set_ap_flag(False)


def process_pending(ifname: str, ap_ssid: str, ap_password: str) -> bool:
    """Returns True if a pending request was found and handled (regardless
    of whether the connection attempt itself succeeded)."""
    if not os.path.exists(PENDING_PATH):
        return False

    try:
        with open(PENDING_PATH, "r") as f:
            req = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        log(f"bad pending request file, discarding: {exc}")
        try:
            os.remove(PENDING_PATH)
        except OSError:
            pass
        return True

    ssid = str(req.get("ssid", "")).strip()
    password = str(req.get("password", ""))
    try:
        os.remove(PENDING_PATH)
    except OSError:
        pass

    if not ssid:
        write_status(mode="ap", attempted_ssid=ssid, success=False, error="Empty SSID")
        return True

    log(f"attempting to connect to requested network '{ssid}'")
    ok, _, err = run(["nmcli", "device", "wifi", "connect", ssid, "password", password, "ifname", ifname])

    if ok:
        log(f"connected to '{ssid}'")
        stop_hotspot()
        write_status(mode="client", attempted_ssid=ssid, connected_ssid=ssid, success=True, error=None)
    else:
        log(f"failed to connect to '{ssid}': {err} -- re-raising fallback hotspot")
        write_status(mode="ap", attempted_ssid=ssid, success=False, error=err or "Connection failed")
        # The failed client-connect attempt tears down whatever was
        # previously active on this radio (including our own hotspot) --
        # restore it immediately rather than waiting out the full
        # DISCONNECTED_GRACE, so the person doesn't lose the setup page
        # they're mid-flow on.
        start_hotspot(ifname, ap_ssid, ap_password)

    return True


def main() -> None:
    ap_ssid, ap_password, ifname = read_env_config()
    log(f"starting -- interface={ifname} ap_ssid={ap_ssid}")

    disconnected_since: float | None = None
    last_ap_retry = 0.0

    while True:
        try:
            if process_pending(ifname, ap_ssid, ap_password):
                disconnected_since = None
                time.sleep(CHECK_INTERVAL)
                continue

            state, conn_name = device_status(ifname)
            in_ap = conn_name == HOTSPOT_CONNECTION_NAME

            if state == "connected" and not in_ap:
                disconnected_since = None
                if os.path.exists(AP_FLAG_PATH):
                    log(f"back on '{conn_name}' -- clearing AP flag")
                    set_ap_flag(False)
                write_status(mode="client", connected_ssid=conn_name, success=True, error=None)

            elif in_ap:
                now = time.time()
                if now - last_ap_retry > AP_RETRY_INTERVAL:
                    last_ap_retry = now
                    log("in AP mode -- checking whether a known network is back in range")
                    run(["nmcli", "device", "connect", ifname], timeout=25)
                    new_state, new_conn = device_status(ifname)
                    if new_state == "connected" and new_conn != HOTSPOT_CONNECTION_NAME:
                        log(f"reconnected to '{new_conn}' -- tearing down hotspot")
                        stop_hotspot()
                        disconnected_since = None
                        write_status(mode="client", connected_ssid=new_conn, success=True, error=None)
                    else:
                        # nmcli device connect may have torn down the
                        # hotspot without finding anything to replace it
                        # with -- put it back.
                        state2, conn2 = device_status(ifname)
                        if conn2 != HOTSPOT_CONNECTION_NAME:
                            start_hotspot(ifname, ap_ssid, ap_password)

            else:
                if disconnected_since is None:
                    disconnected_since = time.time()
                    log(f"WiFi disconnected (state={state}) -- starting {DISCONNECTED_GRACE}s grace timer")
                elif time.time() - disconnected_since > DISCONNECTED_GRACE:
                    ok, err = start_hotspot(ifname, ap_ssid, ap_password)
                    write_status(mode="ap" if ok else "client", success=ok, error=err or None)
                    if ok:
                        last_ap_retry = time.time()
                        disconnected_since = None

        except Exception as exc:  # noqa: BLE001 -- this loop must never die
            log(f"unexpected error, continuing: {exc}")
            write_status(mode="error", success=False, error=str(exc))

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
