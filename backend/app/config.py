from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    cors_origins: str = "http://localhost:5173"

    ir_device: str = "/dev/lirc0"
    gpio_pin: int = 17
    carrier_frequency: int = 38000
    duty_cycle: float = 0.33

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
