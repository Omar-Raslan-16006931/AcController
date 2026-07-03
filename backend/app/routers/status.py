from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.status import StatusResponse
from app.services import ac_state_store
from app.services.system_metrics import get_system_metrics
from app.supabase_client import get_service_client

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("", response_model=StatusResponse)
def get_status(user: CurrentUser = Depends(get_current_user)) -> StatusResponse:
    state = ac_state_store.load_state()
    system = get_system_metrics()

    last_result = None
    last_at = None
    try:
        resp = (
            get_service_client()
            .table("command_history")
            .select("result, created_at")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            last_result = resp.data[0]["result"]
            last_at = resp.data[0]["created_at"]
    except Exception:  # noqa: BLE001 - status must still respond if history read fails
        pass

    return StatusResponse(
        online=True,
        ac_state=state,
        system=system,
        last_command_result=last_result,
        last_command_at=last_at,
    )


@router.get("/ping")
def ping() -> dict:
    """Unauthenticated liveness probe (e.g. for uptime monitors / the topbar
    connection badge before a session exists)."""
    return {"online": True, "server_time": datetime.now(timezone.utc).isoformat()}
