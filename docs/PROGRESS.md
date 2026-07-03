# Build progress

All 11 modules are complete. The project is feature-complete and builds
clean end to end.

## ✅ Module 1 — Project setup, routing, auth, layout
Vite + React 19 + TS, Tailwind v4, hand-integrated shadcn/ui, React Router
protected layout route, Supabase Auth, app shell (sidebar/topbar/command
palette/theme toggle), TanStack Query, Framer Motion transitions, route-level
code splitting, error boundary, offline banner.

## ✅ Module 2 — Dashboard
Live AC state (power/temp/mode/fan/eco), last-command result, and full Pi
system metrics (CPU/RAM/disk/temp/WiFi/IP/hostname/uptime) via
`GET /api/status`, polled every 10s with loading/error states.

## ✅ Module 3 — Remote
Large touch-friendly power toggle, temperature stepper (20–28°C), mode
selector (cool/heat/dry/fan/eco), fan speed selector (low/medium/high/auto).
Every change is an optimistic TanStack Query mutation against FastAPI — no
reload, instant UI feedback, automatic rollback on failure.

## ✅ Module 4 — Schedules
Full CRUD against Supabase `schedules` (name, enabled, time, repeat rule —
once/daily/weekdays/weekends/custom days —, and a power/temp/mode/fan
action), with toggle/duplicate/delete and live Realtime sync across tabs.

## ✅ Module 5 — Timers
Turn-off presets (15/30/45m, 1/2/4h) plus custom duration for both turn-off
and turn-on, backed by the Supabase `timers` table, with a live per-second
countdown and cancel action.

## ✅ Module 6 — History
Searchable, filterable (by result), paginated command log from
`command_history`, with per-row and clear-all delete.

## ✅ Module 7 — Settings
Theme (synced with the app's live theme switcher), timezone, language,
carrier frequency, duty cycle, GPIO pin, and default temperature/mode/fan —
persisted to Supabase `settings`.

## ✅ Module 8 — System
Same live Pi diagnostics as the Dashboard, plus confirmed power actions:
restart backend service, restart Pi, shutdown Pi.

## ✅ Module 9 — FastAPI backend
Full REST API (`/api/status`, `/api/power`, `/api/temperature`, `/api/mode`,
`/api/fan`, `/api/scheduler/*`, `/api/history`, `/api/settings`,
`/api/system/*`), Supabase-JWT auth dependency, `carrier_ac.py` interface +
`ir-ctl` transmission (packet always regenerated, never replayed), a
persisted last-known AC state, and a background scheduler/timer worker.
Import-checked and smoke-tested with `TestClient` (auth required/rejected
correctly, all AC commands round-trip, validation errors return 422).

## ✅ Module 10 — Supabase schema
`database/schema.sql`: `settings`/`schedules`/`timers`/`command_history`
tables, per-user RLS policies, `updated_at` triggers, a
new-user-gets-default-settings trigger, and a Realtime publication for all
four tables.

## ✅ Module 11 — Deployment
`frontend/vercel.json` (SPA rewrites + asset caching), `backend/systemd/`
(unit file + least-privilege sudoers rule for reboot/shutdown/restart),
`backend/scripts/setup_pi.sh` (one-shot Pi provisioning), and
`docs/DEPLOYMENT.md` walking through Supabase → Pi → Vercel in order.

## Known trade-offs / what to do before going live

- `backend/app/services/carrier_ac.py` ships as a clearly-marked **stub**.
  Drop in your real, working `carrier_ac.py` — nothing else needs to change.
- The scheduler/timer worker polls every 20s (`SCHEDULER_POLL_SECONDS`),
  which is minute-granularity-accurate for a household appliance but not
  sub-second precise.
- No automated test suite (unit/e2e) is included — the backend was verified
  with manual `TestClient` smoke tests during development; consider adding
  `pytest` coverage before relying on this unattended long-term.
