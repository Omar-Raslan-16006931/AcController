from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str

    # Only required for projects still on Supabase's legacy JWT secret system.
    # Projects using the current JWT signing keys system (asymmetric
    # ES256/RS256, verified via the project's JWKS endpoint) don't need this
    # set at all -- see app/dependencies.py.
    supabase_jwt_secret: str | None = None

    cors_origins: str = "http://localhost:5173"

    # --- Shortcuts / personal-automation auth (see app/dependencies.py) ------
    # A long random secret Siri/iPhone Shortcuts sends as `X-API-Key` instead
    # of a Supabase JWT. Optional so the app still boots before it's set;
    # the /api/shortcuts endpoints simply 401 until both of these are
    # configured. Generate one with e.g. `openssl rand -hex 32`.
    shortcut_api_key: str | None = None
    # The Supabase auth.users UUID that Shortcuts-triggered commands are
    # attributed to (command_history.user_id has a NOT NULL FK to
    # auth.users, and timers/schedules rows need a real owner) -- this is a
    # single-user household app, so this is just "your" account's user id,
    # found in Supabase -> Authentication -> Users.
    shortcut_user_id: str | None = None

    # gpio_pin/carrier_frequency/duty_cycle were removed — the production
    # CarrierAC library (app/services/carrier_ac.py) ignores all three; its
    # IR timing is derived directly from a captured base.txt file, not from
    # configurable protocol parameters. ir_device is still real: it's the
    # Linux device path passed to `ir-ctl -d <device>`.
    ir_device: str = "/dev/lirc0"

    ir_files_dir: str = "./ir_files"
    state_file_path: str = "./ac_state.json"

    simulate_ir: bool = False

    # --- Manual IR learning (app/services/ac_learn.py) -----------------------
    # Separate device from ir_device above -- that one is the TX-only
    # gpio-ir-tx lirc device used for sending. Learning RECEIVES, which needs
    # a physically different piece of hardware (an IR receiver module, e.g.
    # a TSOP38238) wired to its own GPIO pin with the plain `gpio-ir` overlay
    # (not gpio-ir-tx). See docs/AC_LEARN.md for wiring + config.txt steps.
    ir_rx_device: str = "/dev/lirc1"
    learned_signals_dir: str = "./learned_signals"

    scheduler_poll_seconds: int = 20

    # --- AC brute-force detector (app/services/ac_detector.py) --------------
    # Where a confirmed brand/model match gets persisted, same pattern as
    # state_file_path -- survives a service restart so the Remote page can
    # still show/replay the last detected AC after the Pi reboots.
    detected_ac_file_path: str = "./detected_ac.json"

    # --- WiFi hotspot fallback (app/routers/wifi.py) -------------------------
    # These paths are shared with backend/scripts/wifi_watchdog.py, which
    # runs as its own root systemd service (NOT this app) -- the FastAPI
    # process only ever reads the flag/status file and writes the pending
    # file; it never touches nmcli/networking directly. See
    # docs/WIFI_FALLBACK.md for why the split exists.
    wifi_ap_mode_flag_path: str = "/home/pi/AcController/backend/.wifi_ap_mode"
    wifi_pending_path: str = "/home/pi/AcController/backend/.wifi_pending.json"
    wifi_status_path: str = "/home/pi/AcController/backend/.wifi_last_result.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
