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
        rng = random.Random()  # intentionally not seeded from patient data
        outs: dict[str, TargetOutput] = {}
        probs = {t: round(rng.random(), 2) for t in ("LAD", "LCX", "RCA")}
        # Keep the demo internally plausible (dataset definition: CAD = any vessel >= 50%).
        # This only shapes random placeholder values; real providers must not do this.
        probs["CAD"] = round(rng.uniform(0.5, 1.0), 2) if max(probs.values()) >= 0.5 else round(rng.uniform(0, 0.49), 2)
        for t in ("CAD", "LAD", "LCX", "RCA"):
            p = probs[t]
            pos = p >= 0.5
            outs[t] = TargetOutput(target=t, label=_LABELS[t], probability=p,
                                   predicted_class="positive" if pos else "negative",
                                   class_text=_TEXT[t][0 if pos else 1], illustrative=True)
        return PredictionResponse(
            status="demo", created_at=datetime.now(timezone.utc), provider=self.name,
            model_version="demo-mock", probability_semantics=SEMANTICS,
            message="DEMO: these outputs are random placeholders, not clinical predictions.",
            overall=outs["CAD"],
            vessels={k: outs[k] for k in ("LAD", "LCX", "RCA")},
            explanation=self._demo_explanation(features, rng))

    @staticmethod
    def _demo_explanation(features: dict[str, Any], rng: random.Random) -> Explanation:
        """Layout-test contributions: real feature names/values, RANDOM magnitudes."""
        names = [n for n in features if features[n] is not None and n != "BMI"]
        rng.shuffle(names)
        contribs = []
        for n in names[:8]:
            spec = FEATURE_BY_NAME[n]
            contribs.append(FeatureContribution(
                feature=n, label=spec.label, value=features[n], unit=spec.unit,
                contribution=round(rng.uniform(-0.3, 0.3), 3)))
        contribs.sort(key=lambda c: abs(c.contribution), reverse=True)
        return Explanation(
            method="demo-placeholder", illustrative=True,
            note="ILLUSTRATIVE ONLY: contribution sizes are random and unrelated to this patient.",
            contributions=contribs)
