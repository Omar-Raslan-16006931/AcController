# AcController

A production smart controller for a Carrier air conditioner, driven by a
Raspberry Pi Zero 2 W over IR (GPIO17 → IR LED), controlled from a React web
app hosted on Vercel.

```
React (Vercel) → HTTPS → FastAPI (Raspberry Pi) → carrier_ac.py → ir-ctl → GPIO17 → IR LED → Carrier AC
```

## Repo layout

- `frontend/` — React 19 + Vite + TypeScript + Tailwind + shadcn/ui
- `backend/` — FastAPI service running on the Pi (Module: FASTAPI)
- `database/` — Supabase Postgres schema + RLS policies (Module: SUPABASE)
- `docs/` — this folder

## Frontend — getting started

```
cd frontend
npm install
cp .env.example .env.local   # fill in Supabase + backend URL
npm run dev
```

## Build status

See `docs/PROGRESS.md` for which modules are implemented.
