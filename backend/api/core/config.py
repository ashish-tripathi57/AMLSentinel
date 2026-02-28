from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    DATABASE_URL: str = "sqlite+aiosqlite:///./aml_sentinel.db"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    APP_NAME: str = "AML Sentinel"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    CORS_ORIGIN_REGEX: str = r"http://localhost:\d+"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
