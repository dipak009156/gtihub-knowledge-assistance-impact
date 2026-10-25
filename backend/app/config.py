from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://gka:change_me@localhost:5433/gka"
    llm_provider: str = "ollama"
    gemini_api_key: str = ""


settings = Settings()
