from __future__ import annotations

from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


load_dotenv()


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str | None = None
    google_places_api_key: str | None = None
    allowed_origins: str = "http://localhost:3000"
    resend_api_key: str | None = None
    email_from: str = "Robot Lead Management <onboarding@resend.dev>"
    frontend_url: str = "http://localhost:3000"
    magic_link_ttl_minutes: int = 15
    session_ttl_days: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
