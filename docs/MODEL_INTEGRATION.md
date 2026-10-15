# Connecting the trained model

The app never trains models. `TrainedModelProvider` ([`backend/app/predictors/trained.py`](../backend/app/predictors/trained.py))
loads the artifacts listed in [`backend/model_artifacts/README.md`](../backend/model_artifacts/README.md).

> **Status:** connected to the real ensemble. `TrainedModelProvider` was verified against the notebooks: it reproduces the
> saved test-set probabilities and the CAD test AUC (0.9265), and the API-side feature builder reproduces the training
> frame for all 303 patients. Missing artifacts still yield `unavailable`; it never fabricates a number.

## Switching on

1. Install the ML dependencies with the **pinned** versions (the pipelines are pickles):
   `numpy==2.2.6 pandas==2.3.3 scikit-learn==1.7.2 imbalanced-learn==0.14.2 xgboost==3.1.1 lightgbm==4.7.0 joblib==1.5.2`.
2. Artifacts live in `backend/model_artifacts/` (see its README): `ensemble_bundle.joblib`, `feature_metadata.json`, `eval_report.json`.
   Regenerate with `python cardml---cardiovascular-diesase-prediction/export_artifacts.py`.
3. Restart the API. `GET /api/v1/model-info` shows what was found/loaded. (There is no mock provider any more: without artifacts or ML libraries the API returns `unavailable`.)

### How inference works

`build_model_row()` converts API values to the cleaned encoding (Y/N -> 1/0, Sex male = 1), fills blank optional inputs with
training medians, then derives the engineered columns (`CP_type`, `NLR`, `TG_HDL`, `LDL_HDL`, `pulse_pressure_proxy`,
`risk_factor_count`, `ecg_abnormal_count`, `age_group`, `symptom_score`, `ef_low`) exactly as notebook 01 does.
Each target's probability is the AUC-weighted mean of the five model families; the class uses the target's Youden threshold
from `feature_metadata.json` (not a hard-coded 0.5). Each output carries `threshold` and `reliability` (CAD good, LAD moderate,
LCX/RCA low). `Exertional CP` is accepted by the API but ignored (constant in the training data).

### Explanations

No SHAP explainer is shipped for the ensemble, so `explanation` is `null` (the UI shows its empty state). Global
permutation-importance rankings are in `cardml---cardiovascular-diesase-prediction/results/*_perm_importance_*.csv`.

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

(The shipped `eval_report.json` is generated from the real held-out test split by `export_artifacts.py`.)

## Replacing the provider

Implement `PredictionProvider` (`info()`, `predict()`), return it from `predictors/registry.py`. Routes and frontend do not change.
