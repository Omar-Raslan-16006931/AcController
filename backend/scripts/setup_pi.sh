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

echo "==> Done. Edit backend/.env, then start the service with:"
echo "    sudo systemctl start ac-controller"
echo "    sudo journalctl -u ac-controller -f   # to tail logs"
