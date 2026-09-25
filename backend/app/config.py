import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    strava_client_id: str = os.getenv("STRAVA_CLIENT_ID", "")
    strava_client_secret: str = os.getenv("STRAVA_CLIENT_SECRET", "")
    auth_secret: str = os.getenv("AUTH_SECRET", "dev-change-me-in-production")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    api_base_url: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    strava_redirect_uri: str = os.getenv(
        "STRAVA_REDIRECT_URI", "http://localhost:8000/api/strava/callback"
    )
    strava_backfill_months: int = int(os.getenv("STRAVA_BACKFILL_MONTHS", "12"))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    gemini_fallback_models: str = os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.0-flash,gemini-2.5-flash-preview-05-20",
    )
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    enable_tracing: bool = os.getenv("ENABLE_TRACING", "false").lower() == "true"


@lru_cache
def get_settings() -> Settings:
    if not Settings.database_url:
        raise ValueError("DATABASE_URL is not set.")
    return Settings()
