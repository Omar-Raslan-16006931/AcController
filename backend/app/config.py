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

    scheduler_poll_seconds: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
