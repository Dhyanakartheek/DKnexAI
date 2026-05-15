"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_secret_key: str = "change-me-in-production"
    app_host: str = "0.0.0.0"
    app_port: int = 8080

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Email / IMAP
    email_address: str = ""
    email_password: str = ""
    imap_server: str = "imap.zoho.com"
    imap_port: int = 993
    smtp_server: str = "smtp.zoho.com"
    smtp_port: int = 587

    # Polling
    poll_interval_minutes: int = 5

    # Database
    database_url: str = "sqlite+aiosqlite:///./email_agent.db"

    # Admin seed
    admin_email: str = "admin@company.com"
    admin_password: str = "Admin@123!"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
