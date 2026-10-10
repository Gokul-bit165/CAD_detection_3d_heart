# API contract (v1)

Base URL: `http://localhost:8000/api/v1`. Interactive docs: `http://localhost:8000/docs`.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/health` | Liveness, provider name, model status (`demo` / `ready` / `unavailable`) |
| GET | `/model-info` | Provider, status, expected vs found artifacts, excluded inputs |
| GET | `/features` | The verified input schema (drives the form) |
| POST | `/predictions` | Validate inputs, run the provider, persist, return the result |
| GET | `/predictions` | Saved prediction summaries (newest first) |
| GET | `/predictions/{id}` | One saved result including its inputs |
| GET | `/evaluation` | Evaluation report if `eval_report.json` exists, else `available: false` |

## POST /predictions

```json
{ "features": { "Age": 58, "Sex": "Male", "Weight": 82, "Length": 172, "BP": 140, "PR": 78, "HTN": true, "EF-TTE": 50 } }
```

- Keys must be names from `GET /features`. Required: `Age, Sex, Weight, Length, BP, PR`. `BMI` is derived.
- Binary → `true/false`; categorical/ordinal → one of the listed option values; numbers within `hard_min..hard_max`.
- **HTTP 422** for: any of `LAD, LCX, RCA, Cath` (and cath-derived columns) — message starts "Target leakage"; unknown names; missing required; out-of-range; bad types.

Response (`PredictionResponse`):

```json
{
  "id": "fb1e8c79f4ef",
  "status": "demo",
  "created_at": "2026-10-10T07:58:17Z",
  "provider": "mock",
  "model_version": "demo-mock",
  "message": "DEMO: these outputs are random placeholders, not clinical predictions.",
  "probability_semantics": "DEMO ONLY - …",
  "overall": { "target": "CAD", "label": "Overall CAD", "probability": 0.84, "predicted_class": "positive", "class_text": "CAD", "illustrative": true },
  "vessels": { "LAD": { "…": "same shape" }, "LCX": {}, "RCA": {} },
  "explanation": { "method": "demo-placeholder", "illustrative": true, "note": "…", "contributions": [
    { "feature": "Age", "label": "Age", "value": 58, "unit": "years", "contribution": 0.175, "target": "CAD" } ] },
  "inputs": { "…": "validated inputs incl. derived BMI" },
  "disclaimer": "This application is a research and educational prototype. …"
}
```

Status semantics:

- `demo` — mock provider. Values are random, `illustrative: true`, not derived from the inputs, and not probabilities.
- `ready` — trained model. `probability` is the model's positive-class probability; calibration is whatever the pipeline provides.
- `unavailable` — no usable model. `overall`, `vessels`, `explanation` are `null`, `message` explains why, `id` is `null`, nothing is saved.

`CAD` is always its own model output; it is never computed from the vessel values by the backend or the UI.

## Evaluation report (`backend/model_artifacts/eval_report.json`)

See [MODEL_INTEGRATION.md](MODEL_INTEGRATION.md#evaluation-report).
