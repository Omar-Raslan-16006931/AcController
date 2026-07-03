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
