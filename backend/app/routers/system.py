import subprocess
import threading
import time

from fastapi import APIRouter, Depends

from app.dependencies import CurrentUser, get_current_user
from app.models.system import SystemActionResponse

router = APIRouter(prefix="/api/system", tags=["system"])


def _run_delayed(command: list[str], delay_seconds: float = 1.5) -> None:
    """Runs `command` after a short delay in a background thread, so the
    HTTP response announcing the action has time to reach the client before
    the Pi reboots/shuts down/the service restarts."""

    def _worker():
        time.sleep(delay_seconds)
        subprocess.run(command, check=False)

    threading.Thread(target=_worker, daemon=True).start()


@router.post("/reboot", response_model=SystemActionResponse)
def reboot(user: CurrentUser = Depends(get_current_user)) -> SystemActionResponse:
    _run_delayed(["sudo", "reboot"])
    return SystemActionResponse(
        accepted=True,
        action="reboot",
        message="Rebooting the Raspberry Pi now. It will be offline for ~30-60 seconds.",
    )


@router.post("/shutdown", response_model=SystemActionResponse)
def shutdown(user: CurrentUser = Depends(get_current_user)) -> SystemActionResponse:
    _run_delayed(["sudo", "shutdown", "-h", "now"])
    return SystemActionResponse(
        accepted=True,
        action="shutdown",
        message="Shutting down the Raspberry Pi. Power-cycle it to bring it back online.",
    )


@router.post("/restart", response_model=SystemActionResponse)
def restart(user: CurrentUser = Depends(get_current_user)) -> SystemActionResponse:
    # Restarts just the FastAPI service (systemd will bring it straight back
    # up per the `Restart=always` unit setting), not the whole Pi.
    _run_delayed(["sudo", "systemctl", "restart", "ac-controller"])
    return SystemActionResponse(
        accepted=True,
        action="restart",
        message="Restarting the AcController backend service.",
    )
