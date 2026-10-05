import threading
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.status import StatusResponse
from app.services import ac_state_store, history_logger
from app.services.system_metrics import get_system_metrics
from app.supabase_client import get_service_client

router = APIRouter(prefix="/api/status", tags=["status"])

# Last command per user as read from Supabase, cached so polling /api/status
# doesn't hit the internet every time. Commands sent through this backend
# are tracked in memory (history_logger.last_command) and win over this.
_DB_CACHE_SECONDS = 120.0
_db_cache: dict[str, tuple[float, str | None, str | None]] = {}
_db_lock = threading.Lock()


def _last_from_db(user_id: str) -> tuple[str | None, str | None]:
    now = time.monotonic()
    with _db_lock:
        hit = _db_cache.get(user_id)
    if hit and now - hit[0] < _DB_CACHE_SECONDS:
        return hit[1], hit[2]

    result, created_at = None, None
    try:
        resp = (
            get_service_client()
            .table("command_history")
            .select("result, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            result = resp.data[0]["result"]
            created_at = resp.data[0]["created_at"]
    except Exception:  # noqa: BLE001 - status must still respond if history read fails
        pass

    with _db_lock:
        _db_cache[user_id] = (now, result, created_at)
    return result, created_at


@router.get("", response_model=StatusResponse)
def get_status(user: CurrentUser = Depends(get_current_user)) -> StatusResponse:
    state = ac_state_store.load_state()
    system = get_system_metrics()

    recent = history_logger.last_command(user.user_id)
    if recent:
        last_result, last_at = recent["result"], recent["created_at"]
    else:
        last_result, last_at = _last_from_db(user.user_id)

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
