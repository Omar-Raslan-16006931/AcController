from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import CurrentUser, get_current_user
from app.models.scheduler import (
    ScheduleCreate,
    ScheduleOut,
    ScheduleUpdate,
    TimerCreate,
    TimerOut,
)
from app.supabase_client import get_service_client

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


# ---------------------------------------------------------------------------
# Schedules (recurring)
# ---------------------------------------------------------------------------
@router.get("/schedules", response_model=list[ScheduleOut])
def list_schedules(user: CurrentUser = Depends(get_current_user)) -> list[ScheduleOut]:
    client = get_service_client()
    resp = (
        client.table("schedules")
        .select("*")
        .eq("user_id", user.user_id)
        .order("time")
        .execute()
    )
    return [ScheduleOut(**row) for row in resp.data]


@router.post("/schedules", response_model=ScheduleOut, status_code=201)
def create_schedule(
    body: ScheduleCreate, user: CurrentUser = Depends(get_current_user)
) -> ScheduleOut:
    client = get_service_client()
    payload = body.model_dump(mode="json")
    payload["user_id"] = user.user_id
    resp = client.table("schedules").insert(payload).execute()
    return ScheduleOut(**resp.data[0])


@router.put("/schedules/{schedule_id}", response_model=ScheduleOut)
def update_schedule(
    schedule_id: str,
    body: ScheduleUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> ScheduleOut:
    changes = body.model_dump(mode="json", exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")

    client = get_service_client()
    resp = (
        client.table("schedules")
        .update(changes)
        .eq("id", schedule_id)
        .eq("user_id", user.user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ScheduleOut(**resp.data[0])


@router.delete("/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: str, user: CurrentUser = Depends(get_current_user)
) -> dict:
    client = get_service_client()
    resp = (
        client.table("schedules")
        .delete()
        .eq("id", schedule_id)
        .eq("user_id", user.user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"deleted": True, "id": schedule_id}


@router.post("/schedules/{schedule_id}/duplicate", response_model=ScheduleOut, status_code=201)
def duplicate_schedule(
    schedule_id: str, user: CurrentUser = Depends(get_current_user)
) -> ScheduleOut:
    client = get_service_client()
    existing = (
        client.table("schedules")
        .select("*")
        .eq("id", schedule_id)
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Schedule not found")

    source = existing.data[0]
    copy_payload = {
        "user_id": user.user_id,
        "name": f"{source['name']} (copy)",
        "enabled": False,
        "time": source["time"],
        "repeat": source["repeat"],
        "custom_days": source["custom_days"],
        "run_date": source["run_date"],
        "action": source["action"],
    }
    resp = client.table("schedules").insert(copy_payload).execute()
    return ScheduleOut(**resp.data[0])


# ---------------------------------------------------------------------------
# Timers (one-shot countdowns)
# ---------------------------------------------------------------------------
@router.get("/timers", response_model=list[TimerOut])
def list_timers(user: CurrentUser = Depends(get_current_user)) -> list[TimerOut]:
    client = get_service_client()
    resp = (
        client.table("timers")
        .select("*")
        .eq("user_id", user.user_id)
        .eq("status", "pending")
        .order("fires_at")
        .execute()
    )
    return [TimerOut(**row) for row in resp.data]


@router.post("/timers", response_model=TimerOut, status_code=201)
def create_timer(
    body: TimerCreate, user: CurrentUser = Depends(get_current_user)
) -> TimerOut:
    fires_at = datetime.now(timezone.utc) + timedelta(seconds=body.seconds_from_now)
    client = get_service_client()
    resp = (
        client.table("timers")
        .insert(
            {
                "user_id": user.user_id,
                "label": body.label,
                "action": body.action,
                "fires_at": fires_at.isoformat(),
                "status": "pending",
            }
        )
        .execute()
    )
    return TimerOut(**resp.data[0])


@router.delete("/timers/{timer_id}")
def cancel_timer(timer_id: str, user: CurrentUser = Depends(get_current_user)) -> dict:
    client = get_service_client()
    resp = (
        client.table("timers")
        .update({"status": "cancelled"})
        .eq("id", timer_id)
        .eq("user_id", user.user_id)
        .eq("status", "pending")
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Pending timer not found")
    return {"cancelled": True, "id": timer_id}
