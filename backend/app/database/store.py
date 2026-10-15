"""Minimal SQLite persistence. Stores validated inputs + results; no names/identifiers.
Swap this class for another backend by keeping the same public methods."""
from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from functools import lru_cache

from ..config import settings
from ..schemas.prediction import PredictionResponse, PredictionSummary


# Rows with status "demo" come from the removed placeholder provider (random values, not predictions).
# They stay in old database files but are never listed or served.
class PredictionStore:
    def __init__(self, path: str):
        p = settings.resolve(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        self.path = str(p)
        with self._conn() as c:
            c.execute("""CREATE TABLE IF NOT EXISTS predictions (
                id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT NOT NULL,
                provider TEXT NOT NULL, model_version TEXT, payload TEXT NOT NULL)""")

    @contextmanager
    def _conn(self):
        c = sqlite3.connect(self.path)
        try:
            yield c
            c.commit()
        finally:
            c.close()

    def save(self, r: PredictionResponse) -> PredictionResponse:
        r.id = uuid.uuid4().hex[:12]
        with self._conn() as c:
            c.execute("INSERT INTO predictions VALUES (?,?,?,?,?,?)",
                      (r.id, r.created_at.isoformat(), r.status, r.provider, r.model_version,
                       r.model_dump_json()))
        return r

    def get(self, pid: str) -> PredictionResponse | None:
        with self._conn() as c:
            row = c.execute("SELECT payload FROM predictions WHERE id=? AND status != 'demo'", (pid,)).fetchone()
        return PredictionResponse.model_validate_json(row[0]) if row else None

    def list(self, limit: int = 100) -> list[PredictionSummary]:
        with self._conn() as c:
            rows = c.execute("""SELECT id, created_at, status, provider, model_version FROM predictions WHERE status != 'demo'
                                ORDER BY created_at DESC LIMIT ?""", (limit,)).fetchall()
        return [PredictionSummary(id=i, created_at=t, status=s, provider=p, model_version=m,
                                  has_results=s == "ready") for i, t, s, p, m in rows]


@lru_cache
def get_store() -> PredictionStore:
    return PredictionStore(settings.database_path)
