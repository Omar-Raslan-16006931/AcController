# backend/

FastAPI service that runs on the Raspberry Pi Zero 2 W and drives the
Carrier AC over IR (GPIO17 → IR LED) via `carrier_ac.py` + `ir-ctl`.

## Layout

```
backend/
  app/
    main.py                 # FastAPI app, CORS, router registration, lifespan
    config.py                # env-based settings (pydantic-settings)
    dependencies.py          # Supabase JWT verification (get_current_user)
    supabase_client.py       # service-role Supabase client (server-side only)
    scheduler_worker.py      # background loop: executes due schedules/timers
    models/                  # Pydantic request/response models
    services/
      carrier_ac.py          # *** REPLACE with your real, working carrier_ac.py ***
      ir_transmitter.py       # builds a packet via carrier_ac.py, sends with ir-ctl
      ac_state_store.py       # persists last-known AC state to a local JSON file
      command_executor.py     # shared apply_command() used by every AC route
      history_logger.py       # writes results to Supabase command_history
      system_metrics.py       # CPU/RAM/disk/temp/WiFi/IP/hostname/uptime via psutil
    routers/                 # one file per REST resource (see API section)
  systemd/
    ac-controller.service    # systemd unit — see docs/DEPLOYMENT.md
  requirements.txt
  .env.example
```

## Important: `carrier_ac.py` is a stub

`app/services/carrier_ac.py` ships as a **placeholder** that generates a
harmless dummy IR pulse file, clearly marked as such. Replace it with your
real, already-working `carrier_ac.py` from the Pi — the rest of the backend
(`ir_transmitter.py`) is written against the documented interface
(`CarrierAC()`, `power()`, `set_temperature()`, `set_mode()`, `set_fan()`,
`write_ir_file()`) and needs no other changes once you drop in the real file.

Every command handler always regenerates a full IR packet from the
requested state and transmits it immediately with
`ir-ctl -d /dev/lirc0 --send=<generated file>` — a prerecorded file is never
replayed.

## Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase project + JWT secret
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Set `SIMULATE_IR=1` in `.env` to develop off the Pi (or on a Pi without the
IR hat wired up yet) — `ir_transmitter` will still generate real packet
files via `carrier_ac.py`, it just skips the `ir-ctl` subprocess call.

## API

All routes except `GET /api/status/ping` require
`Authorization: Bearer <supabase-access-token>`.

| Method | Path                                  | Purpose                              |
|--------|---------------------------------------|---------------------------------------|
| GET    | `/api/status`                         | AC state + Pi system metrics          |
| POST   | `/api/power`                          | `{ power: bool }`                     |
| POST   | `/api/temperature`                    | `{ temperature: 16-32 }`              |
| POST   | `/api/mode`                           | `{ mode: cool\|heat\|dry\|fan\|eco }` |
| POST   | `/api/fan`                            | `{ fan: low\|medium\|high\|auto }`    |
| GET/POST | `/api/scheduler/schedules[...]`     | CRUD recurring schedules              |
| GET/POST | `/api/scheduler/timers[...]`        | CRUD countdown timers                 |
| GET/DELETE | `/api/history[...]`               | Command log, search/filter/delete     |
| GET/PUT  | `/api/settings`                     | Per-user preferences                  |
| POST   | `/api/system/reboot`                  | `sudo reboot`                         |
| POST   | `/api/system/shutdown`                | `sudo shutdown -h now`                |
| POST   | `/api/system/restart`                 | `sudo systemctl restart ac-controller`|

Interactive docs are available at `/docs` (Swagger) and `/redoc` once the
server is running.

## Scheduler/timer worker

`scheduler_worker.run_scheduler_loop()` starts inside the FastAPI process
(via the `lifespan` handler in `main.py`) and polls Supabase every
`SCHEDULER_POLL_SECONDS` (default 20s) for:
- pending **timers** whose `fires_at` has passed → executes and marks
  `completed`.
- enabled **schedules** whose local time (per the owning user's
  `settings.timezone`) matches the current minute and whose repeat rule
  (`once`/`daily`/`weekdays`/`weekends`/`custom`) matches today → executes,
  and disables `once` schedules after they fire.

No separate cron job or process is needed — it's part of the same
`ac-controller` systemd service.
