# API contract (v1)

Base URL: `http://localhost:8000/api/v1`. Interactive docs: `http://localhost:8000/docs`.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/health` | Liveness, provider name, model status (`ready` / `unavailable`) |
| GET | `/model-info` | Provider, status, expected vs found artifacts, excluded inputs |
| GET | `/features` | The verified input schema (drives the form) |
| POST | `/predictions` | Validate inputs, run the provider, persist, return the result |
| GET | `/predictions` | Saved prediction summaries (newest first) |
| GET | `/predictions/{id}` | One saved result including its inputs |
| POST | `/import/excel` | Parse + validate patient rows from an .xlsx (multipart `file`); nothing is predicted or stored |
| GET | `/import/template` | Download the Excel template |
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
  "status": "ready",
  "created_at": "2026-10-15T07:58:17Z",
  "provider": "trained",
  "model_version": "2026-10-15-ens5",
  "probability_semantics": "Ensemble-averaged probability of the positive class …",
  "overall": { "target": "CAD", "label": "Overall CAD", "probability": 0.86, "predicted_class": "positive", "class_text": "CAD", "threshold": 0.6351, "reliability": "good" },
  "vessels": { "LAD": { "…": "same shape; reliability moderate" }, "LCX": { "reliability": "low" }, "RCA": { "reliability": "low" } },
  "explanation": null,
  "inputs": { "…": "validated inputs incl. derived BMI" },
  "disclaimer": "This application is a research and educational prototype. …"
}
```

`predicted_class` applies the target's tuned `threshold` (Youden point from training out-of-fold predictions), not 0.5.
`reliability` is the held-out performance tier of that target's model (`good` / `moderate` / `low`).

Status semantics:

- `ready` — trained ensemble. `probability` is the weighted mean of five model families; it is not a calibrated clinical risk.
- `unavailable` — no usable model. `overall`, `vessels`, `explanation` are `null`, `message` explains why, `id` is `null`, nothing is saved.

`CAD` is always its own model output; it is never computed from the vessel values by the backend or the UI.

## POST /import/excel

Multipart upload of an `.xlsx` (max 5 MB, 500 patient rows). Returns `{ sheet, rows[], ignored_outcome_columns[], ignored_unknown_columns[], missing_columns[] }`.
Each row is `{ row, features | null, errors[], outcomes | null }`: `features` are validated and API-encoded (send them to `POST /predictions`);
`outcomes` holds Cath/LAD/LCX/RCA if the sheet has them, for scoring only (they are never part of `features`). 400 for non-.xlsx, 422 for unreadable files or sheets without patient headers.

## Evaluation report (`backend/model_artifacts/eval_report.json`)

See [MODEL_INTEGRATION.md](MODEL_INTEGRATION.md#evaluation-report).
