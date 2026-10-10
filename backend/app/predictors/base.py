from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from ..schemas.prediction import ModelInfo, PredictionResponse


class PredictionProvider(ABC):
    """Interface between the API routes and whatever produces predictions."""

    name: str

    @abstractmethod
    def info(self) -> ModelInfo: ...

    @abstractmethod
    def predict(self, features: dict[str, Any]) -> PredictionResponse:
        """`features` is already validated and leakage-free. Never log its values."""
