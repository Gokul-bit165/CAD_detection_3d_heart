# Connecting the trained model

The app never trains models. `TrainedModelProvider` ([`backend/app/predictors/trained.py`](../backend/app/predictors/trained.py))
loads the artifacts listed in [`backend/model_artifacts/README.md`](../backend/model_artifacts/README.md).

> **Status:** written against that README's artifact inventory, **not yet tested against real artifacts**. Until they exist it
> reports `unavailable` and never fabricates a number (covered by a unit test).

## Switching on

1. Install the ML dependencies in the backend venv: `pip install joblib scikit-learn pandas shap` (plus `lightgbm` / `xgboost` if used).
2. Put the artifacts in `backend/model_artifacts/`:

   | File | Required | Used for |
   | :--- | :---: | :--- |
   | `preprocessor_pipeline.joblib` | yes | `transform(DataFrame)` of the raw feature row |
   | `cad_overall_classifier.joblib` | yes | overall CAD, `predict_proba(X)[:, 1]` |
   | `lad_stenosis_model.joblib`, `lcx_…`, `rca_…` | yes | vessel probabilities |
   | `feature_metadata.json` | yes | see below |
   | `shap_explainer_cad.joblib` | no | explanations for the overall CAD model |
   | `eval_report.json` | no | Model Evaluation page |

3. Set `PREDICTION_PROVIDER=trained` in `.env` and restart the API. `GET /api/v1/model-info` shows what was found/loaded.

### `feature_metadata.json`

```json
{ "model_version": "2026-10-12-a", "feature_names": ["Age", "Weight", "…"], "transformed_feature_names": ["…optional, for SHAP…"] }
```

`feature_names` is the exact input column order. Loading fails (status `unavailable`) if it contains any of `LAD, LCX, RCA, Cath`.

### Input encoding

The adapter builds one-row DataFrame using the **spreadsheet's** encoding (e.g. `Sex` → `Fmale`, `LVH` → `N/Y`,
`DM` → `0/1`) via `dataset_encoding` / `dataset_value` in `features.py`. If the pipeline expects something else (e.g. everything
numeric), change `_to_dataset_value` in one place. Optional fields not supplied are `None`/NaN: the preprocessor must impute them.
Open questions (e.g. `Function Class` 0–3 vs NYHA 1–4) are in [SCHEMA_NOTES.md](SCHEMA_NOTES.md).

### Explanations

If `shap_explainer_cad.joblib` loads, the response carries `explanation.method = "SHAP (TreeExplainer), overall CAD model"` with
the top 15 contributions. The UI renders whatever is returned and shows an empty state when it is `null`. Only the overall CAD
explainer is wired; per-vessel explanations need a `target` per contribution list (the field exists) and an UI selector.

## Evaluation report

`eval_report.json`, validated by [`schemas/evaluation.py`](../backend/app/schemas/evaluation.py). Any mismatch shows
"does not match the contract" instead of partial numbers.

```json
{
  "model_version": "2026-10-12-a",
  "methodology": "Stratified 5-fold CV, out-of-fold predictions",
  "dataset_note": "303 patients, Z-Alizadeh Sani extension",
  "generated_at": "2026-10-12T10:00:00Z",
  "targets": {
    "CAD": { "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "roc_auc": 0.0,
             "confusion_matrix": [[TN, FP], [FN, TP]], "roc_curve": [{ "fpr": 0, "tpr": 0 }], "n_samples": 303 },
    "LAD": {}, "LCX": {}, "RCA": {}
  }
}
```

(The zeros are a shape example only. The repo contains no performance numbers.)

## Replacing the provider

Implement `PredictionProvider` (`info()`, `predict()`), return it from `predictors/registry.py`. Routes and frontend do not change.
