"""Adapter for the trained CAD ensemble (see docs/MODEL_INTEGRATION.md).

The artifacts come from cardml---cardiovascular-diesase-prediction/export_artifacts.py:
an AUC-weighted ensemble of five model families (LR, KNN, RF, XGBoost, LightGBM) for each
of Cath (overall CAD), LAD, LCX and RCA. Every member is a full imblearn pipeline that
includes its own preprocessing, so no separate preprocessor file exists.

Honest by construction: if any required artifact is missing, or loading fails, every
prediction returns status="unavailable". It never falls back to fake numbers.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..schemas.features import FEATURE_BY_NAME, FORBIDDEN_COLUMNS, FEATURES
from ..schemas.prediction import ModelInfo, PredictionResponse, TargetOutput
from .base import PredictionProvider

log = logging.getLogger("cardiovista.trained")

BUNDLE = "ensemble_bundle.joblib"
METADATA = "feature_metadata.json"
REQUIRED = [BUNDLE, METADATA]
TARGET_OF = {"CAD": "Cath", "LAD": "LAD", "LCX": "LCX", "RCA": "RCA"}

SEMANTICS = ("Ensemble-averaged probability of the positive class (CAD / >=50% stenosis), thresholded at the "
             "Youden operating point chosen on training out-of-fold predictions. Not a calibrated clinical risk; "
             "LCX and RCA estimates are weak (held-out AUC about 0.65-0.75).")

_ECG = ["Q Wave", "St Elevation", "St Depression", "Tinversion", "LVH", "Poor R Progression"]
_YES = {"Y", "y", "Yes", "yes", "1", "true", "True"}


class TrainedModelProvider(PredictionProvider):
    name = "trained"

    def __init__(self, artifacts_dir: Path):
        self.dir = artifacts_dir
        self._loaded: dict[str, Any] | None = None
        self._error: str | None = None

    def _found(self) -> list[str]:
        return [f for f in REQUIRED if (self.dir / f).is_file()]

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
            leaked = set(meta.get("feature_names", [])) & (set(FORBIDDEN_COLUMNS) | {"Cath_original", "label_corrected", "n_vessels"})
            if leaked:
                raise RuntimeError(f"artifact feature list contains target columns: {sorted(leaked)}")
            self._loaded = {"meta": meta, "bundle": joblib.load(self.dir / BUNDLE)}
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
        loaded = self._load()
        if missing:
            msg = "Trained model not connected - missing artifacts: " + ", ".join(missing)
        elif loaded is None:
            msg = f"Model artifacts found but could not be loaded ({self._error})."
        else:
            msg = "Trained ensemble loaded (LR, KNN, RF, XGBoost, LightGBM x CAD/LAD/LCX/RCA)."
        return ModelInfo(
            provider=self.name, status="ready" if loaded else "unavailable",
            model_version=self._version(), message=msg, expected_artifacts=REQUIRED,
            found_artifacts=self._found(), excluded_inputs=list(FORBIDDEN_COLUMNS),
            feature_count=len(FEATURES))

    def _unavailable(self, reason: str) -> PredictionResponse:
        return PredictionResponse(status="unavailable", created_at=datetime.now(timezone.utc),
                                  provider=self.name, message=reason, probability_semantics=SEMANTICS)

    def predict(self, features: dict[str, Any]) -> PredictionResponse:
        loaded = self._load()
        if loaded is None:
            return self._unavailable(self.info().message)
        try:
            import pandas as pd
            meta, bundle = loaded["meta"], loaded["bundle"]
            row = build_model_row(features, meta)
            X = pd.DataFrame([row])[meta["feature_names"]]
            outs: dict[str, TargetOutput] = {}
            for api, t in TARGET_OF.items():
                w = bundle["weights"][t]
                p = sum(w[m] * float(pipe.predict_proba(X)[0][1]) for m, pipe in bundle["models"][t].items())
                thr = float(meta["thresholds"][t]["youden"])
                pos = p >= thr
                text = ("CAD", "Normal") if api == "CAD" else ("Stenosis", "Normal")
                outs[api] = TargetOutput(
                    target=api, label="Overall CAD" if api == "CAD" else api, probability=round(p, 4),
                    predicted_class="positive" if pos else "negative", class_text=text[0 if pos else 1],
                    threshold=round(thr, 4), reliability=meta.get("reliability", {}).get(api))
            return PredictionResponse(
                status="ready", created_at=datetime.now(timezone.utc), provider=self.name,
                model_version=self._version(), probability_semantics=SEMANTICS,
                overall=outs["CAD"], vessels={k: outs[k] for k in ("LAD", "LCX", "RCA")})
        except Exception as exc:  # noqa: BLE001
            log.error("Inference failed: %s", type(exc).__name__)  # no clinical values logged
            return self._unavailable(f"Inference failed ({type(exc).__name__}). See server log.")


def _is_yes(v: Any) -> int:
    return int(v is True or str(v) in _YES)


def build_model_row(features: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
    """API values -> the cleaned + engineered columns the pipelines were trained on
    (mirrors notebook 01: Y/N->1/0, Sex male=1, engineered ratios/counts, then fill blanks
    with training medians *before* deriving the engineered columns)."""
    names, fill = meta["feature_names"], meta["fill_values"]
    raw: dict[str, Any] = {}
    for n in names:
        spec = FEATURE_BY_NAME.get(n)
        v = _to_dataset_value(n, features[n]) if (n in features and features[n] is not None) else None
        if v is None or spec is None:  # engineered columns, or a blank optional input
            raw[n] = fill[n] if spec is not None else None
        elif n == "Sex":
            raw[n] = int(v == "Male")
        elif spec.kind == "binary":
            raw[n] = _is_yes(v)
        elif spec.kind == "number" or n in ("Function Class", "Region RWMA"):
            raw[n] = float(v) if spec.kind == "number" else int(v)
        else:
            raw[n] = str(v)
    r = raw
    r["CP_type"] = ("Typical" if r["Typical Chest Pain"] else "Atypical" if r["Atypical"]
                    else "Nonanginal" if r["Nonanginal"] else "NoCP")
    r["NLR"] = r["Neut"] / r["Lymph"]
    r["TG_HDL"] = r["TG"] / r["HDL"]
    r["LDL_HDL"] = r["LDL"] / r["HDL"]
    r["pulse_pressure_proxy"] = r["BP"] / r["PR"]
    r["risk_factor_count"] = sum(r[c] for c in ("DM", "HTN", "Current Smoker", "FH", "DLP", "Obesity"))
    r["ecg_abnormal_count"] = sum(r[c] for c in _ECG) + int(r["BBB"] != "N")
    age = r["Age"]
    r["age_group"] = "<=45" if age <= 45 else "46-55" if age <= 55 else "56-65" if age <= 65 else ">65"
    r["symptom_score"] = r["Typical Chest Pain"] * 2 + r["Atypical"] + r["Function Class"] + r["Dyspnea"]
    r["ef_low"] = int(r["EF-TTE"] < 50)
    return {n: r[n] for n in names}


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
