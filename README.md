# CardioVista

Research prototype for the **Multimodal AI Hackathon 2026, Track A**: predict coronary artery disease (CAD) and LAD / LCX / RCA
stenosis from clinical data and show the outputs on an interactive 3D heart.

> This application is a research and educational prototype. Its outputs are not a diagnosis and do not replace professional
> medical assessment or formal diagnostic imaging.

## Current status (read this first)

| Part | State |
| :--- | :--- |
| React + R3F dashboard, assessment form, results workspace, history, evaluation page | Working |
| FastAPI service, typed schemas, SQLite history, target-leakage enforcement | Working, 10 backend tests pass |
| **Predictions** | **Demo only.** The mock provider returns random, clearly labelled placeholder values. No trained model is connected. |
| Trained-model adapter | Written against `backend/model_artifacts/README.md`; **untested** until artifacts exist |
| Explanations / evaluation | UI and contracts ready; show empty states until real data is supplied |
| 3D heart | One textured scan (`heart-scan.glb`). LAD/LCX/RCA are an **approximate, editable overlay** (the scan has no separate vessels), coloured by model output with floating score tags |

No accuracy, patient counts or other statistics are shown anywhere unless they come from real data.

## Prerequisites

Node.js 20+ (tested on 24), Python 3.10+ (tested on 3.11), a WebGL-capable browser.

## Run it

```bash
# 1. configuration (optional: defaults work; .env is git-ignored)
cp .env.example .env

# 2. backend  ->  http://localhost:8000  (docs at /docs)
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --port 8000

# 3. frontend (new terminal)  ->  http://localhost:5173
cd frontend
npm install
npm run dev
```

Tests / checks:

```bash
cd backend && python -m pytest -q       # API, leakage rejection, unavailable-model behaviour
cd frontend && npm run build            # type-check + production build
```

## Using the app

1. **Overview** – status cards and recent assessments (empty until you run one).
2. **New Assessment** – seven tabbed steps generated from the verified feature schema, then a review screen. *Load synthetic
   example* fills invented test values; *Reset form* clears them.
3. **Results** – 3D heart plus Overall CAD, LAD, LCX, RCA cards. Click a vessel on the heart or its card; both stay in sync.
   Below: feature contributions and the submitted inputs.
4. **3D Heart Explorer** – free exploration and the *Model inspector* (mesh list, mapping check).
5. **Prediction History**, **Model Evaluation**, **Settings / About**.

### Demo mode

`PREDICTION_PROVIDER=mock` (default). Every result carries `status: "demo"`, an on-canvas **DEMO VALUES** tag and a banner.
Values are random and unrelated to the entered measurements; the "feature contributions" in demo mode are random too and are
flagged *illustrative*.

### Connecting the real model

Put the artifacts in `backend/model_artifacts/`, install the ML libraries, set `PREDICTION_PROVIDER=trained`.
Details and file formats: [docs/MODEL_INTEGRATION.md](docs/MODEL_INTEGRATION.md). Without artifacts the trained provider reports
`unavailable` and the UI says so.

## Safety and privacy design

- `LAD`, `LCX`, `RCA`, `Cath` (and cath-derived columns) are rejected by the API with HTTP 422 and absent from the form.
- No names or identifiers are collected; inputs are stored only in a local SQLite file (`backend/data/`, git-ignored).
- The dataset spreadsheet is never served to or bundled in the browser. Clinical values are not logged.
- No treatment advice. Vessel highlights show model output only, never a lesion location.

## Documentation

- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) – endpoints and payloads
- [docs/MODEL_INTEGRATION.md](docs/MODEL_INTEGRATION.md) – artifacts, encodings, evaluation report format
- [docs/HEART_MODEL_SETUP.md](docs/HEART_MODEL_SETUP.md) – GLB inspection findings, mapping, Blender preparation
- [docs/SCHEMA_NOTES.md](docs/SCHEMA_NOTES.md) – dictionary vs. spreadsheet discrepancies, unsupported fields
- [docs/ASSET_ATTRIBUTION.md](docs/ASSET_ATTRIBUTION.md) – asset and dataset attribution (provenance of the GLB needs confirming)
- Challenge brief: [docs/Track_A_Cardiovascular_Challenge.pdf](docs/Track_A_Cardiovascular_Challenge.pdf)

## Layout

```
backend/app/      api/ (routes) · schemas/ (features, prediction, evaluation) · predictors/ (mock, trained, registry) · database/
backend/tests/    pytest suite
backend/model_artifacts/   drop trained artifacts here
frontend/src/     app/ (shell, routing, app data) · components/ui · features/{dashboard,patient-assessment,heart-3d,predictions,
                  explainability,model-evaluation,history,settings} · services/api.ts · lib/risk.ts (shared colour scale)
frontend/public/models/heart-scan.glb   (generated, git-ignored) · coronary-heart.glb (original schematic, unused)
```
