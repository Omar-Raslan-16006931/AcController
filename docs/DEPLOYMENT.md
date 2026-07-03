# Deployment

Three pieces to stand up, in order: Supabase, the Pi backend, then the Vercel
frontend (it needs both of the others' URLs).

## 1. Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `database/schema.sql` in full.
3. Settings → API: copy the **Project URL**, the **anon public key**, and
   the **service_role key**.
4. Settings → API → JWT Settings: copy the **JWT Secret** (used by the Pi
   backend to verify tokens locally without calling Supabase Auth on every
   request).
5. Authentication → Providers: email/password is enabled by default. Create
   your user(s) here (Authentication → Users → Add user), since this app
   doesn't ship a public sign-up flow — it's a household appliance
   controller, not a multi-tenant SaaS.

## 2. Backend (Raspberry Pi Zero 2 W)

Prerequisites: Raspberry Pi OS with the IR transmitter wired to GPIO17,
`ir-ctl` available (`v4l-utils` package), and `/dev/lirc0` present
(`dtoverlay=gpio-ir-tx,gpio_pin=17` in `/boot/firmware/config.txt`, then
reboot).

```bash
git clone <your-repo-url> AcController
cd AcController/backend
bash scripts/setup_pi.sh          # venv, deps, systemd unit, sudoers rule
```

Then:

1. Replace `app/services/carrier_ac.py` with your real, working
   `carrier_ac.py` (the stub only generates placeholder IR data).
2. Edit `.env`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` from
     step 1.
   - `CORS_ORIGINS` — include both `http://localhost:5173` (local dev) and
     your Vercel URL once you have it (step 3). Comma-separated, no spaces.
   - `SIMULATE_IR=0` once the real `carrier_ac.py` is in place and the IR
     hardware is wired up (`SIMULATE_IR=1` generates packets but skips the
     `ir-ctl` call — useful while testing).
3. Start it: `sudo systemctl start ac-controller`
4. Verify: `curl http://localhost:8000/api/status/ping` and
   `sudo journalctl -u ac-controller -f`
5. Expose it to the internet so Vercel can reach it — either:
   - **Tailscale Funnel / Cloudflare Tunnel** (recommended: no port
     forwarding, works behind CGNAT), or
   - Port-forward 8000 on your router to the Pi and use a dynamic DNS
     hostname, terminating TLS in front of it (e.g. Caddy/nginx +
     Let's Encrypt) since the frontend calls it over HTTPS.

## 3. Frontend (Vercel)

```bash
cd frontend
vercel link      # or import the repo in the Vercel dashboard
```

Set these environment variables in the Vercel project (Settings →
Environment Variables):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | from step 1 |
| `VITE_SUPABASE_ANON_KEY` | the **anon** key, never the service role key |
| `VITE_API_BASE_URL` | the public HTTPS URL from step 2.5 |

Deploy: `vercel --prod` (or push to your connected Git branch).
`vercel.json` already configures the SPA rewrite so client-side routes
(`/remote`, `/settings`, etc.) work on refresh, and long-term caching for
hashed assets.

Finally, go back to the Pi's `.env` and set `CORS_ORIGINS` to include this
Vercel URL, then `sudo systemctl restart ac-controller`.

## Updating

- **Frontend**: push to your connected branch — Vercel redeploys
  automatically.
- **Backend**: `git pull`, `source .venv/bin/activate && pip install -r requirements.txt`
  if dependencies changed, then `sudo systemctl restart ac-controller` (or
  use the System page's "Restart backend" button).
