#!/usr/bin/env bash
# One-time setup script for the Raspberry Pi. Run from the `backend/`
# directory: `bash scripts/setup_pi.sh`
set -euo pipefail

if [[ $EUID -eq 0 ]]; then
  echo "Run this as the 'pi' user, not root (it uses sudo where needed)." >&2
  exit 1
fi

echo "==> Installing system packages (v4l-utils for ir-ctl, python3-venv)"
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip v4l-utils

echo "==> Creating Python virtual environment"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example — fill in your Supabase credentials"
  cp .env.example .env
fi

echo "==> Installing systemd service"
sudo cp systemd/ac-controller.service /etc/systemd/system/ac-controller.service
sudo systemctl daemon-reload
sudo systemctl enable ac-controller

echo "==> Installing least-privilege sudoers rule (reboot/shutdown/restart only)"
sudo cp systemd/ac-controller.sudoers /etc/sudoers.d/ac-controller
sudo chmod 440 /etc/sudoers.d/ac-controller
sudo visudo -c

echo "==> Installing WiFi watchdog / hotspot fallback service (see docs/WIFI_FALLBACK.md)"
if ! systemctl is-active --quiet NetworkManager; then
  echo "    WARNING: NetworkManager doesn't look active on this system."
  echo "    The watchdog calls nmcli, so it needs NetworkManager managing WiFi"
  echo "    (the default on Raspberry Pi OS Bookworm and newer). If this Pi is"
  echo "    on an older dhcpcd-based image, the watchdog will install but won't"
  echo "    actually be able to bring up a hotspot until you switch to"
  echo "    NetworkManager -- see docs/WIFI_FALLBACK.md."
fi
sudo cp systemd/ac-controller-wifi-watchdog.service /etc/systemd/system/ac-controller-wifi-watchdog.service
sudo systemctl daemon-reload
sudo systemctl enable ac-controller-wifi-watchdog

if ! grep -q "^WIFI_AP_SSID=" .env 2>/dev/null; then
  echo "" >> .env
  echo "# --- WiFi hotspot fallback (see docs/WIFI_FALLBACK.md) -- CHANGE THE PASSWORD ---" >> .env
  echo "WIFI_AP_SSID=AcController-Setup" >> .env
  echo "WIFI_AP_PASSWORD=change-this-password" >> .env
  echo "WIFI_INTERFACE=wlan0" >> .env
  echo "WIFI_AP_MODE_FLAG_PATH=$(pwd)/.wifi_ap_mode" >> .env
  echo "WIFI_PENDING_PATH=$(pwd)/.wifi_pending.json" >> .env
  echo "WIFI_STATUS_PATH=$(pwd)/.wifi_last_result.json" >> .env
  echo "    Added default WIFI_AP_* settings to .env -- EDIT WIFI_AP_PASSWORD before relying on this."
fi

echo "==> Done. Edit backend/.env (especially WIFI_AP_PASSWORD), then start both services with:"
echo "    sudo systemctl start ac-controller"
echo "    sudo systemctl start ac-controller-wifi-watchdog"
echo "    sudo journalctl -u ac-controller -f              # to tail app logs"
echo "    sudo journalctl -u ac-controller-wifi-watchdog -f # to tail WiFi watchdog logs"
