from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import CurrentUser, get_current_user
from app.models.settings import SettingsOut, SettingsUpdate
from app.supabase_client import get_service_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings_row(user: CurrentUser = Depends(get_current_user)) -> SettingsOut:
    client = get_service_client()
    resp = (
        client.table("settings")
        .select("*")
        .eq("user_id", user.user_id)
        .limit(1)
        .execute()
    )
    if not resp.data:
        # Should not normally happen — a row is created by the
        # `on_auth_user_created` trigger — but create one defensively.
        insert_resp = client.table("settings").insert({"user_id": user.user_id}).execute()
        return SettingsOut(**insert_resp.data[0])

    return SettingsOut(**resp.data[0])


@router.put("", response_model=SettingsOut)
def update_settings(
    body: SettingsUpdate, user: CurrentUser = Depends(get_current_user)
) -> SettingsOut:
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")

    client = get_service_client()
    resp = (
        client.table("settings")
        .update(changes)
        .eq("user_id", user.user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Settings row not found for this user")

    return SettingsOut(**resp.data[0])
