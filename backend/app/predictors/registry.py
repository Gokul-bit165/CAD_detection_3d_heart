from __future__ import annotations

from functools import lru_cache

from ..config import settings
from .base import PredictionProvider
from .mock import MockPredictionProvider
from .trained import TrainedModelProvider


@lru_cache
def get_provider() -> PredictionProvider:
    if settings.prediction_provider.lower() == "trained":
        return TrainedModelProvider(settings.resolve(settings.model_artifacts_dir))
    return MockPredictionProvider()
