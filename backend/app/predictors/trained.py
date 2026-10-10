"""Adapter for the ML owner's artifacts (see docs/MODEL_INTEGRATION.md).

Honest by construction: if any required artifact is missing, or loading fails, every
prediction returns status="unavailable". It never falls back to fake numbers.

NOTE: written against the artifact inventory in backend/model_artifacts/README.md and
NOT yet exercised against real artifacts - verify once they exist.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..schemas.features import FEATURE_BY_NAME, FEATURES, FORBIDDEN_COLUMNS
from ..schemas.prediction import (Explanation, FeatureContribution, ModelInfo,
                                  PredictionResponse, TargetOutput)
from .base import PredictionProvider

log = logging.getLogger("cardiovista.trained")

MODEL_FILES = {
    "CAD": "cad_overall_classifier.joblib",
    "LAD": "lad_stenosis_model.joblib",
    "LCX": "lcx_stenosis_model.joblib",
    "RCA": "rca_stenosis_model.joblib",
}
PREPROCESSOR = "preprocessor_pipeline.joblib"
METADATA = "feature_metadata.json"
EXPLAINER = "shap_explainer_cad.joblib"  # optional
REQUIRED = [PREPROCESSOR, METADATA, *MODEL_FILES.values()]

SEMANTICS = ("Model-estimated probability of the positive class (CAD / >=50% stenosis). "
             "Calibration depends on the training pipeline and is not guaranteed.")


class TrainedModelProvider(PredictionProvider):
    name = "trained"

    def __init__(self, artifacts_dir: Path):
        self.dir = artifacts_dir
        self._loaded: dict[str, Any] | None = None
        self._error: str | None = None

    def _found(self) -> list[str]:
        return [f for f in [*REQUIRED, EXPLAINER] if (self.dir / f).is_file()]

    def _missing(self) -> list[str]:
        return [f for f in REQUIRED if not (self.dir / f).is_file()]

    def _load(self) -> dict[str, Any] | None:
        if self._loaded is not None:
            return self._loaded
        if self._missing():
            return None
        try:
            import joblib  # imported lazily: only needed when artifacts exist
            meta = json.loads((self.dir / METADATA).read_text(encoding="utf-8"))
            bundle: dict[str, Any] = {
                "meta": meta,
                "pre": joblib.load(self.dir / PREPROCESSOR),
                "models": {t: joblib.load(self.dir / f) for t, f in MODEL_FILES.items()},
                "explainer": joblib.load(self.dir / EXPLAINER) if (self.dir / EXPLAINER).is_file() else None,
            }
            leaked = set(meta.get("feature_names", [])) & set(FORBIDDEN_COLUMNS)
            if leaked:
                raise RuntimeError(f"artifact feature list contains target columns: {sorted(leaked)}")
            self._loaded = bundle
            self._error = None
        except Exception as exc:  # noqa: BLE001 - surfaced as 'unavailable'
            self._error = f"{type(exc).__name__}: {exc}"
            log.error("Failed to load model artifacts: %s", self._error)
            return None
        return self._loaded

    def _version(self) -> str | None:
        b = self._load()
        return str(b["meta"].get("model_version", "unversioned")) if b else None

    def info(self) -> ModelInfo:
        missing = self._missing()
        bundle = self._load()
        if missing:
            msg = "Trained model not connected - missing artifacts: " + ", ".join(missing)
        elif bundle is None:
            msg = f"Model artifacts found but could not be loaded ({self._error})."
        else:
            msg = "Trained model artifacts loaded."
        return ModelInfo(
            provider=self.name, status="ready" if bundle else "unavailable",
            model_version=self._version(), message=msg, expected_artifacts=REQUIRED,
            found_artifacts=self._found(), excluded_inputs=list(FORBIDDEN_COLUMNS),
            feature_count=len(FEATURES))

    def _unavailable(self, reason: str) -> PredictionResponse:
        return PredictionResponse(status="unavailable", created_at=datetime.now(timezone.utc),
                                  provider=self.name, message=reason, probability_semantics=SEMANTICS)

    def predict(self, features: dict[str, Any]) -> PredictionResponse:
        bundle = self._load()
        if bundle is None:
            return self._unavailable(self.info().message)
        try:
            import pandas as pd
            row = {n: _to_dataset_value(n, v) for n, v in features.items()}
            order = bundle["meta"].get("feature_names") or list(row)
            X = bundle["pre"].transform(pd.DataFrame([row])[order])
            outs: dict[str, TargetOutput] = {}
            for t, model in bundle["models"].items():
                p = float(model.predict_proba(X)[0][1])
                pos = p >= 0.5
                text = ("CAD", "Normal") if t == "CAD" else ("Stenosis", "Normal")
                outs[t] = TargetOutput(target=t, label="Overall CAD" if t == "CAD" else t,
                                       probability=round(p, 4),
                                       predicted_class="positive" if pos else "negative",
                                       class_text=text[0 if pos else 1])
            return PredictionResponse(
                status="ready", created_at=datetime.now(timezone.utc), provider=self.name,
                model_version=self._version(), probability_semantics=SEMANTICS,
                overall=outs["CAD"], vessels={k: outs[k] for k in ("LAD", "LCX", "RCA")},
                explanation=self._explain(bundle, X, features))
        except Exception as exc:  # noqa: BLE001
            log.error("Inference failed: %s", type(exc).__name__)  # no clinical values logged
            return self._unavailable(f"Inference failed ({type(exc).__name__}). See server log.")

    @staticmethod
    def _explain(bundle: dict[str, Any], X: Any, features: dict[str, Any]) -> Explanation | None:
        explainer = bundle.get("explainer")
        if explainer is None:
            return None
        try:
            sv = explainer.shap_values(X)
            vals = sv[1][0] if isinstance(sv, list) else sv[0]
            if getattr(vals, "ndim", 1) == 2:  # (features, classes)
                vals = vals[:, 1]
            names = bundle["meta"].get("transformed_feature_names") or bundle["meta"].get("feature_names", [])
            contribs = []
            for n, c in zip(names, vals):
                spec = FEATURE_BY_NAME.get(n)
                contribs.append(FeatureContribution(
                    feature=n, label=spec.label if spec else n, value=features.get(n),
                    unit=spec.unit if spec else None, contribution=float(c)))
            contribs.sort(key=lambda c: abs(c.contribution), reverse=True)
            return Explanation(method="SHAP (TreeExplainer), overall CAD model",
                               note="Contributions describe model behaviour, not causal effects.",
                               contributions=contribs[:15])
        except Exception as exc:  # noqa: BLE001
            log.warning("Explanation failed: %s", type(exc).__name__)
            return None


def _to_dataset_value(name: str, value: Any) -> Any:
    """Map API values back to the spreadsheet's encoding (Y/N vs 0/1, 'Fmale', ...)."""
    spec = FEATURE_BY_NAME[name]
    if value is None or not spec.options:
        return value
    key = "true" if value is True else "false" if value is False else str(value)
    for o in spec.options:
        if str(o.value) == key:
            return o.dataset_value if o.dataset_value is not None else o.value
    return value
