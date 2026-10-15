from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from ..config import settings
from ..database.store import get_store
from ..importing.excel import MAX_BYTES, ImportFileError, parse_workbook, template_bytes
from ..predictors.registry import get_provider
from ..schemas.evaluation import EvaluationReport, EvaluationResponse
from ..schemas.features import (FEATURES, FORBIDDEN_COLUMNS, GROUP_LABELS, UNSUPPORTED_GROUPS,
                                FeatureSpec)
from ..schemas.prediction import (HealthResponse, ModelInfo, PredictionRequest,
                                  PredictionResponse, PredictionSummary)

API_VERSION = "1.0.0"
router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    info = get_provider().info()
    return HealthResponse(api_version=API_VERSION, provider=info.provider,
                          model_status=info.status, time=datetime.now(timezone.utc))


@router.get("/model-info", response_model=ModelInfo)
def model_info() -> ModelInfo:
    return get_provider().info()


class FeatureSchemaResponse(BaseModel):
    groups: dict[str, str]
    features: list[FeatureSpec]
    excluded_inputs: list[str]
    unsupported_groups: list[dict[str, str]]


@router.get("/features", response_model=FeatureSchemaResponse)
def features() -> FeatureSchemaResponse:
    return FeatureSchemaResponse(groups=GROUP_LABELS, features=FEATURES,
                                 excluded_inputs=list(FORBIDDEN_COLUMNS),
                                 unsupported_groups=UNSUPPORTED_GROUPS)


@router.post("/predictions", response_model=PredictionResponse)
def create_prediction(req: PredictionRequest) -> PredictionResponse:
    result = get_provider().predict(req.features)
    if result.status == "unavailable":
        return result  # not persisted: nothing to inspect later
    result.inputs = req.features
    return get_store().save(result)


class ImportRow(BaseModel):
    row: int  # Excel row number
    features: dict | None = None  # validated, API-encoded; None when `errors` is non-empty
    errors: list[str] = []
    outcomes: dict[str, bool] | None = None  # known angiography result per target, for scoring only


class ImportResponse(BaseModel):
    sheet: str
    rows: list[ImportRow]
    ignored_outcome_columns: list[str]
    ignored_unknown_columns: list[str]
    missing_columns: list[str]


@router.post("/import/excel", response_model=ImportResponse)
async def import_excel(file: UploadFile = File(...)) -> ImportResponse:
    """Parse + validate patient rows from an .xlsx. Nothing is predicted or stored here."""
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx workbooks are supported.")
    data = await file.read(MAX_BYTES + 1)
    try:
        return ImportResponse(**parse_workbook(data))
    except ImportFileError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/import/template")
def import_template() -> Response:
    return Response(template_bytes(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="cardiovista_patient_template.xlsx"'})


@router.get("/predictions", response_model=list[PredictionSummary])
def list_predictions(limit: int = 100) -> list[PredictionSummary]:
    return get_store().list(min(max(limit, 1), 500))


@router.get("/predictions/{prediction_id}", response_model=PredictionResponse)
def get_prediction(prediction_id: str) -> PredictionResponse:
    r = get_store().get(prediction_id)
    if r is None:
        raise HTTPException(404, "Prediction not found")
    return r


@router.get("/evaluation", response_model=EvaluationResponse)
def evaluation() -> EvaluationResponse:
    path = settings.resolve(settings.model_artifacts_dir) / "eval_report.json"
    if not path.is_file():
        return EvaluationResponse(available=False, message="Evaluation results not yet connected.")
    try:
        report = EvaluationReport.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except Exception as exc:  # noqa: BLE001
        return EvaluationResponse(
            available=False,
            message=f"eval_report.json exists but does not match the contract ({type(exc).__name__}).")
    return EvaluationResponse(available=True, message="Loaded from eval_report.json.", report=report)
