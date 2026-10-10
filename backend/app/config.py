"""Runtime configuration, read from environment variables (see ../.env.example)."""
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"), extra="ignore", populate_by_name=True
    )

    environment: str = "development"
    # "mock" (demo outputs) or "trained" (real artifacts from backend/model_artifacts)
    prediction_provider: str = "mock"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:3000"
    model_artifacts_dir: str = "backend/model_artifacts"
    database_path: str = "backend/data/cardiovista.db"
    api_port: int = Field(default=8000)

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def resolve(self, p: str) -> Path:
        path = Path(p)
        return path if path.is_absolute() else REPO_ROOT / path


settings = Settings()
