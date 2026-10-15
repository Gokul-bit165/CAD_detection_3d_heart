# CardioVista

Research prototype for the **Multimodal AI Hackathon 2026, Track A**: predict coronary artery disease (CAD) and LAD / LCX / RCA
stenosis from clinical data and show the outputs on an interactive 3D heart.

> This application is a research and educational prototype. Its outputs are not a diagnosis and do not replace professional
> medical assessment or formal diagnostic imaging.

## Current status (read this first)

| Part | State |
| :--- | :--- |
| React + R3F dashboard, assessment form, results workspace, history, evaluation page | Working |
| FastAPI service, typed schemas, SQLite history, target-leakage enforcement | Working, backend tests pass |
| **Predictions** | **Real trained model.** AUC-weighted ensemble (LR, KNN, RF, XGBoost, LightGBM) for overall CAD, LAD, LCX and RCA, trained on the Z-Alizadeh Sani data. Held-out test AUC: CAD 0.93, LAD 0.80, LCX 0.75, RCA 0.66 (LCX/RCA are flagged low-confidence in the UI). |
| Excel import | Upload many patients from .xlsx, predict them all, score against known outcomes. Test files: `docs/test_data/` |
| Explanations / evaluation | Evaluation page shows real held-out test metrics. Per-patient feature contributions are not available for the ensemble (empty state) |
| 3D heart | Realistic scan-based heart built in Blender (`frontend/public/models/heart-realistic.glb`) with separate branching LAD/LCX/RCA arteries. Per-artery score drives colour, plaque bulges and a travelling blood-pulse speed; animated camera fly-to, guided tour and ghost view. If the GLB is missing the app falls back to a procedural heart (valves + blood flow) |

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
4. **3D Heart Explorer** – guided tour, inside view (valves + blood flow) and sliders to set each artery's damage score by hand (not a prediction).
5. **Prediction History**, **Model Evaluation**, **Settings / About**.

### Excel import and testing the model

**Excel Import** (sidebar) takes an .xlsx with the dataset column names in the header. Download the template from the page, or
use the ready-made files in `docs/test_data/`:

- `cardiovista_test_patients.xlsx` – the 61 held-out test patients (never used for training or tuning) with their true
  angiography results. After *Predict*, the page scores the model on them: expected CAD accuracy 0.89, sensitivity 0.91,
  specificity 0.82, ROC-AUC 0.93. The true-outcome columns are never given to the model.
- `cardiovista_edge_cases.xlsx` – rows that exercise validation (out-of-range age, missing weight, unknown categories) and blank handling.

Regenerate both with `python cardml---cardiovascular-diesase-prediction/make_test_workbooks.py`.

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
- [docs/SCHEMA_NOTES.md](docs/SCHEMA_NOTES.md) – dictionary vs. spreadsheet discrepancies, unsupported fields
- [docs/ASSET_ATTRIBUTION.md](docs/ASSET_ATTRIBUTION.md) – asset and dataset attribution (provenance of the GLB needs confirming)
- Challenge brief: [docs/Track_A_Cardiovascular_Challenge.pdf](docs/Track_A_Cardiovascular_Challenge.pdf)

## Layout

```
backend/app/      api/ (routes) · schemas/ (features, prediction, evaluation) · predictors/ (trained, registry) · importing/ (Excel) · database/
backend/tests/    pytest suite
backend/model_artifacts/   drop trained artifacts here
frontend/src/     app/ (shell, routing, app data) · components/ui · features/{dashboard,patient-assessment,heart-3d,predictions,
                  explainability,model-evaluation,history,settings} · services/api.ts · lib/risk.ts (shared colour scale)
frontend/src/features/heart-3d/   anatomy.ts (chambers, arteries, valves, flow paths) · ProceduralHeart.tsx · HeartScene.tsx (camera, tour, toolbar)
```
