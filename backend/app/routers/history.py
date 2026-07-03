from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import CurrentUser, get_current_user
from app.models.history import HistoryEntry, HistoryPage
from app.supabase_client import get_service_client

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=HistoryPage)
def list_history(
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    result: Optional[str] = Query(default=None, pattern="^(success|failure)$"),
    mode: Optional[str] = None,
    search: Optional[str] = None,
) -> HistoryPage:
    client = get_service_client()
    query = (
        client.table("command_history")
        .select("*", count="exact")
        .eq("user_id", user.user_id)
    )

    if result:
        query = query.eq("result", result)
    if mode:
        query = query.eq("mode", mode)
    if search:
        # Search across mode/fan/source/error text fields.
        like = f"%{search}%"
        query = query.or_(
            f"mode.ilike.{like},fan.ilike.{like},source.ilike.{like},error.ilike.{like}"
        )

    resp = (
        query.order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return HistoryPage(
        items=[HistoryEntry(**row) for row in resp.data],
        total=resp.count or 0,
        limit=limit,
        offset=offset,
    )


@router.delete("/{entry_id}")
def delete_history_entry(
    entry_id: str, user: CurrentUser = Depends(get_current_user)
) -> dict:
    client = get_service_client()
    resp = (
        client.table("command_history")
        .delete()
        .eq("id", entry_id)
        .eq("user_id", user.user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="History entry not found")
    return {"deleted": True, "id": entry_id}


@router.delete("")
def clear_history(user: CurrentUser = Depends(get_current_user)) -> dict:
    client = get_service_client()
    client.table("command_history").delete().eq("user_id", user.user_id).execute()
    return {"deleted": True}
