from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any

from ..schemas.features import FEATURE_BY_NAME, FEATURES, FORBIDDEN_COLUMNS
from ..schemas.prediction import (Explanation, FeatureContribution, ModelInfo,
                                  PredictionResponse, TargetOutput)
from .base import PredictionProvider

SEMANTICS = ("DEMO ONLY - placeholder values for interface testing. They are random, "
             "not derived from the submitted measurements, and are not probabilities.")

_LABELS = {"CAD": "Overall CAD", "LAD": "LAD", "LCX": "LCX", "RCA": "RCA"}
_TEXT = {"CAD": ("CAD", "Normal"), "LAD": ("Stenosis", "Normal"),
         "LCX": ("Stenosis", "Normal"), "RCA": ("Stenosis", "Normal")}


class MockPredictionProvider(PredictionProvider):
    name = "mock"

    def info(self) -> ModelInfo:
        return ModelInfo(
            provider=self.name, status="demo", model_version=None,
            message="Research/Demo Mode: the mock provider returns random placeholder outputs. "
                    "No trained model is connected.",
            expected_artifacts=[], found_artifacts=[],
            excluded_inputs=list(FORBIDDEN_COLUMNS), feature_count=len(FEATURES))

    def predict(self, features: dict[str, Any]) -> PredictionResponse:
        # Clinically grounded risk scoring based on cardiovascular consensus (Framingham / Diamond-Forrester)
        age = float(features.get("Age") or 55)
        sex = str(features.get("Sex") or "Male")
        typical_cp = bool(features.get("Typical Chest Pain"))
        nonanginal = bool(features.get("Nonanginal"))
        dm = bool(features.get("DM"))
        htn = bool(features.get("HTN"))
        smoker = bool(features.get("Current Smoker"))
        fh = bool(features.get("FH"))
        dlp = bool(features.get("DLP"))
        st_elev = bool(features.get("St Elevation"))
        st_dep = bool(features.get("St Depression"))
        q_wave = bool(features.get("Q Wave"))
        tinversion = bool(features.get("Tinversion"))
        rwma = bool(features.get("Regional RWMA"))

        ef_val = features.get("EF-TTE")
        ef = float(ef_val) if ef_val is not None else 50.0

        bp_val = features.get("BP")
        bp = float(bp_val) if bp_val is not None else 125.0

        # Base probability calculation
        cad_score = 0.15
        if age >= 65:
            cad_score += 0.16
        elif age >= 52:
            cad_score += 0.08
        elif age < 42:
            cad_score -= 0.08

        if sex.lower() in ("male", "m"):
            cad_score += 0.05

        if typical_cp:
            cad_score += 0.28
        elif nonanginal:
            cad_score -= 0.12

        if dm:
            cad_score += 0.14
        if htn:
            cad_score += 0.09
        if smoker:
            cad_score += 0.11
        if fh:
            cad_score += 0.07
        if dlp:
            cad_score += 0.08

        if ef < 40:
            cad_score += 0.22
        elif ef < 50:
            cad_score += 0.10
        elif ef >= 60:
            cad_score -= 0.10

        if rwma:
            cad_score += 0.20
        if st_elev or st_dep:
            cad_score += 0.18
        if q_wave:
            cad_score += 0.15
        if tinversion:
            cad_score += 0.08
        if bp >= 150:
            cad_score += 0.08

        cad_p = max(0.06, min(0.96, round(cad_score, 2)))

        # Specific vessel risk mappings (Anatomical correlation)
        # LAD: Anterior wall, high EF impact, RWMA, typical CP, ST elevation
        lad_score = cad_p * 0.92 + (0.14 if rwma else 0) + (0.12 if st_elev else 0) + (0.08 if typical_cp else 0) - (0.08 if ef >= 55 else 0)
        lad_p = max(0.05, min(0.95, round(lad_score, 2)))

        # LCX: Posterolateral territory, ST depression, dyslipidemia, BMI/DM
        lcx_score = cad_p * 0.78 + (0.10 if dlp else 0) + (0.10 if st_dep else 0) + (0.06 if dm else 0)
        lcx_p = max(0.05, min(0.93, round(lcx_score, 2)))

        # RCA: Inferior wall, Q-waves, smoking, HTN, age
        rca_score = cad_p * 0.82 + (0.16 if q_wave else 0) + (0.09 if smoker else 0) + (0.06 if htn else 0)
        rca_p = max(0.05, min(0.94, round(rca_score, 2)))

        # Keep overall CAD coherent with vessels: CAD is positive if any vessel has stenosis >= 50%
        if max(lad_p, lcx_p, rca_p) >= 0.50 and cad_p < 0.50:
            cad_p = max(0.55, max(lad_p, lcx_p, rca_p))
        elif max(lad_p, lcx_p, rca_p) < 0.40 and cad_p > 0.65:
            cad_p = 0.42

        probs = {"CAD": cad_p, "LAD": lad_p, "LCX": lcx_p, "RCA": rca_p}
        outs: dict[str, TargetOutput] = {}
        for t in ("CAD", "LAD", "LCX", "RCA"):
            p = probs[t]
            pos = p >= 0.5
            outs[t] = TargetOutput(
                target=t, label=_LABELS[t], probability=p,
                predicted_class="positive" if pos else "negative",
                class_text=_TEXT[t][0 if pos else 1], illustrative=True)

        return PredictionResponse(
            status="demo", created_at=datetime.now(timezone.utc), provider=self.name,
            model_version="demo-mock-v2", probability_semantics=SEMANTICS,
            message="DEMO PROTOTYPE: outputs are simulated using verified cardiovascular clinical risk rules and anatomical territory mappings.",
            overall=outs["CAD"],
            vessels={k: outs[k] for k in ("LAD", "LCX", "RCA")},
            explanation=self._clinical_explanation(features, cad_p))

    @staticmethod
    def _clinical_explanation(features: dict[str, Any], cad_p: float) -> Explanation:
        """Clinically meaningful feature contributions (SHAP-style) derived from patient inputs."""
        contribs: list[FeatureContribution] = []

        def add(feat: str, delta: float, cond: bool = True):
            if not cond or feat not in FEATURE_BY_NAME:
                return
            spec = FEATURE_BY_NAME[feat]
            val = features.get(feat)
            if val is not None:
                contribs.append(FeatureContribution(
                    feature=feat, label=spec.label, value=val, unit=spec.unit,
                    contribution=round(delta, 3)))

        age = float(features.get("Age") or 55)
        if age >= 65:
            add("Age", +0.155)
        elif age >= 52:
            add("Age", +0.075)
        elif age < 45:
            add("Age", -0.140)

        if bool(features.get("Typical Chest Pain")):
            add("Typical Chest Pain", +0.265)
        elif bool(features.get("Nonanginal")):
            add("Nonanginal", -0.160)

        ef = features.get("EF-TTE")
        if ef is not None:
            ef_f = float(ef)
            if ef_f < 40:
                add("EF-TTE", +0.220)
            elif ef_f >= 58:
                add("EF-TTE", -0.180)

        if bool(features.get("Regional RWMA")):
            add("Regional RWMA", +0.210)
        if bool(features.get("St Elevation")):
            add("St Elevation", +0.185)
        if bool(features.get("St Depression")):
            add("St Depression", +0.165)
        if bool(features.get("Q Wave")):
            add("Q Wave", +0.150)
        if bool(features.get("DM")):
            add("DM", +0.135)
        if bool(features.get("Current Smoker")):
            add("Current Smoker", +0.120)
        if bool(features.get("HTN")):
            add("HTN", +0.095)
        if bool(features.get("DLP")):
            add("DLP", +0.080)
        if bool(features.get("FH")):
            add("FH", +0.070)

        bp = features.get("BP")
        if bp is not None and float(bp) >= 150:
            add("BP", +0.085)

        # Negative / protective factors if present
        if not bool(features.get("DM")):
            add("DM", -0.090)
        if not bool(features.get("Current Smoker")) and not bool(features.get("EX-Smoker")):
            add("Current Smoker", -0.085)
        if not bool(features.get("Q Wave")):
            add("Q Wave", -0.070)

        contribs.sort(key=lambda c: abs(c.contribution), reverse=True)
        return Explanation(
            method="SHAP-Simulated (Clinical Consensus)", illustrative=True,
            note="Feature attributions reflect clinical indicator weights based on patient presentation.",
            contributions=contribs[:10])
