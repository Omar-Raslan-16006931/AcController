"""
/api/shortcuts — a thin, Siri/iPhone-Shortcuts-friendly surface over the
same command pipeline every other router uses.

Every endpoint here is a direct pass-through to `apply_command()` (or, for
/timer, the existing `scheduler.create_timer()`) — no IR/state/validation
logic is duplicated. The only things this module adds are: a request shape
that's easy to build in the Shortcuts app, the dual Supabase-JWT/API-key
auth (see `get_shortcut_or_current_user` in app/dependencies.py), and a
small set of named "scene" presets since no such concept existed before.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import CurrentUser, get_shortcut_or_current_user
from app.models.ac_state import (
    AuxCommandResponse,
    CommandResponse,
    FanRequest,
    ModeRequest,
    PowerRequest,
    TemperatureRequest,
)
from app.models.scheduler import TimerCreate, TimerOut
from app.routers.scheduler import create_timer
from app.services import ac_learn, ir_transmitter
from app.services.command_executor import apply_command

router = APIRouter(prefix="/api/shortcuts", tags=["shortcuts"])

# Commands arriving here are attributed to source="system" in
# command_history — distinct from "manual" (the web UI) without needing a
# new value added to the `command_history.source` CHECK constraint in
# database/schema.sql ("system" already exists there but was previously
# unused). If per-automation attribution is ever needed, add "shortcut" to
# that CHECK constraint + the Literal in command_executor.py/history_logger.py
# at the same time.
_SOURCE = "system"


class ShortcutTimerRequest(BaseModel):
    """`{"minutes": 20}` — a sleep-timer convenience wrapper around the
    existing one-shot timer feature. Always schedules a `turn_off` (the
    universal "Siri, turn the AC off in 20 minutes" ask); use the Timers
    page directly for a `turn_on` countdown."""

    minutes: int = Field(gt=0, le=24 * 60, description="Minutes from now until the AC turns off (max 1440 = 24h).")


# Named presets for the /scene/* endpoints. No "scene" concept existed
# anywhere in this app before this request — these are reasonable starting
# defaults, not something captured from a spec, so tune the temperature/
# mode/fan values here to taste.
_SCENES: dict[str, dict] = {
    "sleep": {"power": True, "temperature": 26, "mode": "cool", "fan": "low"},
    "home": {"power": True, "temperature": 23, "mode": "cool", "fan": "medium"},
    "off": {"power": False},
}


def _apply_scene(name: str, user: CurrentUser) -> CommandResponse:
    preset = _SCENES[name]
    return apply_command(user_id=user.user_id, source=_SOURCE, **preset)


@router.post(
    "/power",
    response_model=CommandResponse,
    summary="Turn the AC on or off",
    description='Body: `{"power": true}` or `{"power": false}`. '
    "Calls the same `apply_command()` the website's power buttons use — "
    "power=false replays the captured power_off.txt waveform, unchanged.",
)
def shortcut_power(
    body: PowerRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, power=body.power, source=_SOURCE)


@router.post(
    "/temperature",
    response_model=CommandResponse,
    summary="Set the target temperature (20-28°C)",
    description='Body: `{"temperature": 24}`. Out-of-range values are rejected '
    "with 400 before reaching the IR layer, same as every other endpoint.",
)
def shortcut_temperature(
    body: TemperatureRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, temperature=body.temperature, source=_SOURCE)


@router.post(
    "/mode",
    response_model=CommandResponse,
    summary="Set the AC mode",
    description='Body: `{"mode": "cool"}` — one of `cool`, `heat`, `dry` '
    "(the exact set the real Carrier remote supports; no `auto`/`eco`).",
)
def shortcut_mode(
    body: ModeRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, mode=body.mode, source=_SOURCE)


@router.post(
    "/fan",
    response_model=CommandResponse,
    summary="Set the fan speed",
    description='Body: `{"fan": "medium"}` — one of `low`, `medium`, `high`.',
)
def shortcut_fan(
    body: FanRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> CommandResponse:
    return apply_command(user_id=user.user_id, fan=body.fan, source=_SOURCE)


@router.post(
    "/light",
    response_model=AuxCommandResponse,
    summary="Toggle the AC's display light",
    description="No body. Replays the real remote's Light button (a captured "
    "raw waveform, not an encoded state change — see aux.py/ir_transmitter.py). "
    "Requires `raw/ac_codes/light.txt` to exist on the Pi; returns "
    "`{\"success\": false, \"message\": \"...\"}` if it hasn't been captured yet.",
)
def shortcut_light(user: CurrentUser = Depends(get_shortcut_or_current_user)) -> AuxCommandResponse:
    result = ir_transmitter.send_raw_command("light.txt", "carrier-light")
    return AuxCommandResponse(success=result.success, message=result.error)


@router.post(
    "/timer",
    response_model=TimerOut,
    status_code=201,
    summary="Schedule a sleep timer (turn off in N minutes)",
    description='Body: `{"minutes": 20}`. Creates a one-shot timer the '
    "existing scheduler background worker fires later — this does not turn "
    "the AC off immediately. Delegates straight to the same "
    "`create_timer()` the Timers page uses.",
)
def shortcut_timer(
    body: ShortcutTimerRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> TimerOut:
    timer_body = TimerCreate(
        action="turn_off",
        seconds_from_now=body.minutes * 60,
        label="Shortcuts sleep timer",
    )
    return create_timer(timer_body, user)


@router.post(
    "/scene/sleep",
    response_model=CommandResponse,
    summary="Apply the Sleep scene",
    description=f"Preset: `{_SCENES['sleep']}`. Adjust `_SCENES['sleep']` in "
    "shortcuts.py to change the values.",
)
def shortcut_scene_sleep(user: CurrentUser = Depends(get_shortcut_or_current_user)) -> CommandResponse:
    return _apply_scene("sleep", user)


@router.post(
    "/scene/home",
    response_model=CommandResponse,
    summary="Apply the Home scene",
    description=f"Preset: `{_SCENES['home']}`. Adjust `_SCENES['home']` in "
    "shortcuts.py to change the values.",
)
def shortcut_scene_home(user: CurrentUser = Depends(get_shortcut_or_current_user)) -> CommandResponse:
    return _apply_scene("home", user)


class ShortcutButtonRequest(BaseModel):
    name: str = Field(min_length=1, description="Learned button name, exactly as shown in the app.")


class ShortcutButtonResponse(BaseModel):
    success: bool
    name: str
    message: str | None = None


@router.get(
    "/buttons",
    response_model=list[str],
    summary="List learned button names",
    description="For a Shortcuts 'Choose from List' step. Names are what "
    "POST /api/shortcuts/button expects.",
)
def shortcut_list_buttons(user: CurrentUser = Depends(get_shortcut_or_current_user)) -> list[str]:
    return [b["name"] for b in ac_learn.list_buttons()]


@router.post(
    "/button",
    response_model=ShortcutButtonResponse,
    summary="Press a learned button",
    description='Body: `{"name": "POWER ON"}`. Replays a button captured on '
    "Detect AC, Learn manually. Matching ignores letter case.",
)
def shortcut_press_button(
    body: ShortcutButtonRequest, user: CurrentUser = Depends(get_shortcut_or_current_user)
) -> ShortcutButtonResponse:
    wanted = body.name.strip().lower()
    match = next((b["name"] for b in ac_learn.list_buttons() if b["name"].lower() == wanted), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"No learned button named {body.name!r}")
    result = ac_learn.send_learned(match)
    if not result.success:
        raise HTTPException(status_code=502, detail=result.error or "IR transmit failed")
    return ShortcutButtonResponse(success=True, name=match, message=f"Sent {match}")


@router.post(
    "/scene/off",
    response_model=CommandResponse,
    summary="Apply the Off scene",
    description=f"Preset: `{_SCENES['off']}`. Equivalent to POST /api/shortcuts/power "
    'with `{"power": false}`.',
)
def shortcut_scene_off(user: CurrentUser = Depends(get_shortcut_or_current_user)) -> CommandResponse:
    return _apply_scene("off", user)
