from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Population Management API"
    api_prefix: str = "/api"
    database_url: str = "postgresql://admin:123456@db:5432/population_db"
    jwt_secret: str = "supersecretkey"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance so the configuration is loaded once."""
    return Settings()


settings = get_settings()
