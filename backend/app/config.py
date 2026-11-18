import os
import tempfile
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


BACKEND_DIR = Path(__file__).resolve().parents[1]


def default_db_url() -> str:
    db_file = BACKEND_DIR / "gka.db"
    return f"sqlite:///{db_file.as_posix()}"


def default_storage_dir() -> str:
    if os.name == "nt":
        return str(Path(tempfile.gettempdir()) / "gka")
    return "/tmp/gka"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", BACKEND_DIR / ".env"), extra="ignore"
    )

    database_url: str = default_db_url()
    llm_provider: str = "ollama"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    repo_storage_dir: str = default_storage_dir()
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:5173/auth/callback"


settings = Settings()
