#!/usr/bin/env bash
# Runs after every cloudflared quick-tunnel (re)start (ExecStartPost in
# systemd/cf-tunnel.service). Quick tunnels get a new random
# *.trycloudflare.com URL each time, so this reads the fresh URL from the
# tunnel log, writes it into Vercel's VITE_API_BASE_URL, and triggers a
# redeploy -- the site follows the Pi automatically after any reboot.
#
# Secrets live OUTSIDE the repo in ~/.config/accontroller/vercel.env
# (written by bootstrap_pi.sh, chmod 600):
#   VERCEL_TOKEN=...
#   VERCEL_PROJECT=prj_...
#   DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
set -euo pipefail

CONF="/home/pi/.config/accontroller/vercel.env"
LOG="/home/pi/AcController/backend/.cf.log"

if [[ ! -f "$CONF" ]]; then
  echo "No $CONF -- skipping Vercel sync (tunnel still works, update Vercel by hand)."
  exit 0
fi
# shellcheck disable=SC1090
source "$CONF"

URL=""
for _ in $(seq 1 45); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | grep -v '^https://api\.' | tail -1 || true)
  [[ -n "$URL" ]] && break
  sleep 2
done
if [[ -z "$URL" ]]; then
  echo "Timed out waiting for the tunnel URL in $LOG" >&2
  exit 1
fi
echo "Tunnel URL: $URL"

ENV_ID=$(curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT/env" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(next(e['id'] for e in d['envs'] if e['key']=='VITE_API_BASE_URL'))")

curl -fsS -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/env/$ENV_ID" \
  -d "{\"value\":\"$URL\"}" > /dev/null

curl -fsS -X POST "$DEPLOY_HOOK_URL" > /dev/null
echo "Pushed $URL to Vercel and triggered a redeploy."
