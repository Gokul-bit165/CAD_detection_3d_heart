from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .features import validate_features

DISCLAIMER = (
    "This application is a research and educational prototype. Its outputs are not a "
    "diagnosis and do not replace professional medical assessment or formal diagnostic imaging."
)

Status = Literal["ready", "unavailable"]
VesselId = Literal["LAD", "LCX", "RCA"]


class PredictionRequest(BaseModel):
    """Inference input. Only verified, non-target features are accepted."""

    features: dict[str, Any] = Field(description="Feature name -> value (see GET /api/v1/features)")

    @field_validator("features")
    @classmethod
    def _check(cls, v: dict[str, Any]) -> dict[str, Any]:
        return validate_features(v)  # raises ValueError -> HTTP 422


class TargetOutput(BaseModel):
    target: Literal["CAD", "LAD", "LCX", "RCA"]
    label: str
    # None when the provider produced no estimate for this target.
    probability: float | None = Field(default=None, ge=0, le=1)
    predicted_class: Literal["positive", "negative"] | None = None
    class_text: str | None = None  # e.g. "Stenosis" / "Normal" / "CAD"
    threshold: float | None = None  # decision threshold applied to `probability`
    reliability: Literal["good", "moderate", "low"] | None = None  # held-out performance tier


class FeatureContribution(BaseModel):
    feature: str
    label: str
    value: Any = None
    unit: str | None = None
    contribution: float  # signed; positive pushes toward the positive class
    target: Literal["CAD", "LAD", "LCX", "RCA"] = "CAD"


class Explanation(BaseModel):
    method: str  # e.g. "SHAP (TreeExplainer)"
    note: str | None = None
    contributions: list[FeatureContribution] = []


class PredictionResponse(BaseModel):
    id: str | None = None
    status: Status
    created_at: datetime
    provider: str
    model_version: str | None = None
    message: str | None = None
    probability_semantics: str
    overall: TargetOutput | None = None
    vessels: dict[VesselId, TargetOutput] | None = None
    explanation: Explanation | None = None
    inputs: dict[str, Any] | None = None
    disclaimer: str = DISCLAIMER


class PredictionSummary(BaseModel):
    id: str
    created_at: datetime
    status: Status
    provider: str
    model_version: str | None
    has_results: bool


class ModelInfo(BaseModel):
    provider: str
    status: Status
    model_version: str | None = None
    message: str
    targets: list[str] = ["CAD", "LAD", "LCX", "RCA"]
    expected_artifacts: list[str]
    found_artifacts: list[str]
    excluded_inputs: list[str]
    feature_count: int


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    api_version: str
    provider: str
    model_status: Status
    time: datetime
