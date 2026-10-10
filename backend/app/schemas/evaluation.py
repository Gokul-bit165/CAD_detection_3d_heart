"""Evaluation report contract. The ML owner writes this JSON to
backend/model_artifacts/eval_report.json (see docs/MODEL_INTEGRATION.md)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class RocPoint(BaseModel):
    fpr: float
    tpr: float


class TargetEvaluation(BaseModel):
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    roc_auc: float | None = None
    # [[TN, FP], [FN, TP]]
    confusion_matrix: list[list[int]] | None = None
    roc_curve: list[RocPoint] | None = None
    n_samples: int | None = None


class EvaluationReport(BaseModel):
    model_version: str
    methodology: str  # e.g. "Stratified 5-fold cross-validation, out-of-fold predictions"
    dataset_note: str | None = None
    generated_at: str | None = None
    targets: dict[Literal["CAD", "LAD", "LCX", "RCA"], TargetEvaluation]


class EvaluationResponse(BaseModel):
    available: bool
    message: str
    report: EvaluationReport | None = None
