"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./responso.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Population cap for priority scoring
    POPULATION_CAP: int = 2500
    # Waiting time cap in hours
    WAITING_CAP_HOURS: float = 20.0
    # Algorithm version identifier
    ALGORITHM_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
