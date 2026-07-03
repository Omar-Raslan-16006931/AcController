"""
Background poller that executes due schedules and timers.

Runs as an asyncio task inside the same FastAPI process (started in
`main.py`'s lifespan handler) — no separate process or cron job needed.
Polls Supabase every `scheduler_poll_seconds` (default 20s), which is
frequent enough for minute-granularity schedules/timers on a household
appliance without hammering the database.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.services import ac_state_store, history_logger, ir_transmitter
from app.supabase_client import get_service_client

logger = logging.getLogger("ac-controller.scheduler")

# Sunday=0 .. Saturday=6, matching the `custom_days` column convention.
_WEEKDAYS_SUN0 = {1, 2, 3, 4, 5}
_WEEKENDS_SUN0 = {0, 6}


def _to_sun0_weekday(dt: datetime) -> int:
    # Python's dt.weekday(): Monday=0 .. Sunday=6
    return (dt.weekday() + 1) % 7


def _settings_by_user(client) -> dict[str, dict]:
    resp = client.table("settings").select("user_id, timezone, default_temperature, default_mode, default_fan").execute()
    return {row["user_id"]: row for row in resp.data}


def _apply_action(user_id: str, action: dict, source: str) -> None:
    current = ac_state_store.load_state()
    candidate = current.model_copy(
        update={
            k: v
            for k, v in {
                "power": action.get("power"),
                "temperature": action.get("temperature"),
                "mode": action.get("mode"),
                "fan": action.get("fan"),
            }.items()
            if v is not None
        }
    )

    result = ir_transmitter.send_state(candidate)
    if result.success:
        saved = ac_state_store.save_state(candidate)
        history_logger.log_command(user_id=user_id, state=saved, source=source, result="success")
    else:
        history_logger.log_command(
            user_id=user_id, state=candidate, source=source, result="failure", error=result.error
        )


def _process_timers(client, now_utc: datetime) -> None:
    resp = (
        client.table("timers")
        .select("*")
        .eq("status", "pending")
        .lte("fires_at", now_utc.isoformat())
        .execute()
    )
    for timer in resp.data:
        action = {"power": timer["action"] == "turn_on"}
        _apply_action(timer["user_id"], action, source="timer")
        client.table("timers").update(
            {"status": "completed", "completed_at": now_utc.isoformat()}
        ).eq("id", timer["id"]).execute()
        logger.info("Executed timer %s (%s) for user %s", timer["id"], timer["action"], timer["user_id"])


def _process_schedules(client, now_utc: datetime, settings_by_user: dict[str, dict]) -> None:
    resp = client.table("schedules").select("*").eq("enabled", True).execute()

    for schedule in resp.data:
        user_settings = settings_by_user.get(schedule["user_id"])
        tz_name = user_settings["timezone"] if user_settings else "UTC"
        try:
            tz = ZoneInfo(tz_name)
        except Exception:  # noqa: BLE001 - fall back rather than crash the worker
            tz = ZoneInfo("UTC")

        now_local = now_utc.astimezone(tz)
        scheduled_time = schedule["time"]  # "HH:MM:SS" string from Postgres
        now_hhmm = now_local.strftime("%H:%M")
        scheduled_hhmm = scheduled_time[:5]

        if now_hhmm != scheduled_hhmm:
            continue

        last_run_at = schedule.get("last_run_at")
        if last_run_at:
            last_run_local = datetime.fromisoformat(last_run_at).astimezone(tz)
            if last_run_local.strftime("%Y-%m-%d %H:%M") == now_local.strftime("%Y-%m-%d %H:%M"):
                continue  # already fired this exact minute

        repeat = schedule["repeat"]
        sun0_weekday = _to_sun0_weekday(now_local)

        should_fire = False
        if repeat == "once":
            should_fire = schedule.get("run_date") == now_local.date().isoformat()
        elif repeat == "daily":
            should_fire = True
        elif repeat == "weekdays":
            should_fire = sun0_weekday in _WEEKDAYS_SUN0
        elif repeat == "weekends":
            should_fire = sun0_weekday in _WEEKENDS_SUN0
        elif repeat == "custom":
            should_fire = sun0_weekday in set(schedule.get("custom_days") or [])

        if not should_fire:
            continue

        _apply_action(schedule["user_id"], schedule["action"], source="schedule")

        update_payload = {"last_run_at": now_utc.isoformat()}
        if repeat == "once":
            update_payload["enabled"] = False
        client.table("schedules").update(update_payload).eq("id", schedule["id"]).execute()

        logger.info("Executed schedule %s (%s) for user %s", schedule["id"], schedule["name"], schedule["user_id"])


async def run_scheduler_loop() -> None:
    settings = get_settings()
    client = get_service_client()

    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            _process_timers(client, now_utc)
            settings_by_user = _settings_by_user(client)
            _process_schedules(client, now_utc, settings_by_user)
        except Exception:  # noqa: BLE001 - the loop must never die
            logger.exception("scheduler loop iteration failed")

        await asyncio.sleep(settings.scheduler_poll_seconds)
