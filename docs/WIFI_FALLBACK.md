# WiFi hotspot fallback

For travelling with the Pi: if it can't get on WiFi (new location, wrong
password, network out of range), it raises its own hotspot so you can feed
it new credentials from your phone — no monitor/keyboard/SSH needed.

## How it works

Three pieces, deliberately kept separate from the FastAPI app:

1. **`backend/scripts/wifi_watchdog.py`** — a small stdlib-only Python
   script that runs continuously as its own **root** systemd service
   (`ac-controller-wifi-watchdog.service`), completely independent of
   `ac-controller.service`. Every 15s it checks whether the WiFi interface
   is actually connected. If it's been disconnected for more than 90
   seconds straight, it runs `nmcli device wifi hotspot ...` to raise a
   fallback access point (SSID/password from `WIFI_AP_SSID` /
   `WIFI_AP_PASSWORD` in `.env`). While in hotspot mode it periodically
   (every 5 min) retries known networks in case you're back in range of
   one, and immediately picks up any newly-submitted credentials (see
   below).
2. **`app/routers/wifi.py`** — a handful of endpoints on the *same* FastAPI
   app you already run, but **unauthenticated**: `GET /wifi-setup` (a
   self-contained HTML page, no external assets since there's no internet
   in AP mode), `GET /api/wifi/status`, `GET /api/wifi/networks`, and
   `POST /api/wifi/connect`. This process never touches `nmcli` itself —
   it only reads/writes three small files that the watchdog also
   reads/writes, described below.
3. Three files as the handoff between them (paths configurable via
   `.env`, must match between both services):
   - `.wifi_ap_mode` — existence = the watchdog currently has the hotspot
     up. `/api/wifi/networks` and `/api/wifi/connect` 403 unless this file
     exists, which is what keeps those endpoints from being a standing
     unauthenticated attack surface during normal operation (Pi on home
     WiFi, reachable over Tailscale) — they're dormant unless the Pi has
     already independently decided it's disconnected.
   - `.wifi_pending.json` — written by `POST /api/wifi/connect`, consumed
     and deleted by the watchdog within ~15s.
   - `.wifi_last_result.json` — written by the watchdog after every
     connection attempt (or connectivity check), read by
     `GET /api/wifi/status`.

## Setup

Already wired into `scripts/setup_pi.sh`:

```
sudo cp systemd/ac-controller-wifi-watchdog.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ac-controller-wifi-watchdog
```

**Change `WIFI_AP_PASSWORD` in `.env` before relying on this** — the setup
script fills in a placeholder. Must be 8+ characters (WPA2-PSK minimum) or
`nmcli device wifi hotspot` fails outright.

Requires **NetworkManager** managing WiFi — the default on Raspberry Pi OS
Bookworm and newer. `setup_pi.sh` warns if it doesn't detect
`NetworkManager` active. If you're on an older dhcpcd-based image, either
upgrade the OS image or swap the `nmcli` calls in `wifi_watchdog.py` for a
hostapd+dnsmasq setup instead (a bigger change, not included here).

## Using it while travelling

1. Pi can't connect (new hotel/Airbnb WiFi, etc.) → after ~90s it raises
   `AcController-Setup` (or whatever you set `WIFI_AP_SSID` to).
2. On your phone: join that network, then open
   `http://10.42.0.1:8000/wifi-setup` (NetworkManager's default hotspot
   subnet — check `nmcli connection show Hotspot` if it's been changed).
3. Scan or type in the new network's name/password, tap Connect.
4. The Pi tries it within ~15 seconds.

**Known limitation:** the Pi Zero 2 W has one WiFi radio. If the password
you enter is wrong, the failed connection attempt briefly tears down the
hotspot itself before the watchdog re-raises it (a few seconds) — the
setup page may look like it hung. Wait ~20s, rejoin `AcController-Setup` if
your phone dropped it, and check `GET /api/wifi/status` (or just reload the
page) to see the error and try again.

## Troubleshooting

```
sudo journalctl -u ac-controller-wifi-watchdog -f
```

`GET /api/wifi/status` also reports `"watchdog_running": false` if the
status file has never been written at all — a sign the service isn't
installed/running rather than just "nothing to report yet".
