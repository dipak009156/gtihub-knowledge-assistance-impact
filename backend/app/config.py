from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://gka:change_me@localhost:5433/gka"
    llm_provider: str = "ollama"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"


settings = Settings()
