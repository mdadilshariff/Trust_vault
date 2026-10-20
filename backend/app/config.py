from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://trustvault:changeme@localhost:5432/trustvault"
    sync_database_url: str = "postgresql://trustvault:changeme@localhost:5432/trustvault"

    # Security
    secret_key: str = "change-me-to-64-random-bytes-in-hex"
    session_cookie_name: str = "tv_session"
    session_max_age_seconds: int = 3600

    # Storage
    upload_dir: str = "./storage/uploads"
    max_upload_bytes: int = 52_428_800  # 50 MB
    allowed_extensions: str = "pdf,docx,doc,xlsx,xls,pptx,ppt,txt,png,jpg,jpeg,gif,zip,csv,md"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    # App
    environment: str = "development"
    log_level: str = "INFO"

    @property
    def allowed_ext_set(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_extensions.split(",")}

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
