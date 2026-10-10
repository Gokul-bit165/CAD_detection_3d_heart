# Backend Model Artifacts

This directory stores trained machine learning model weights, feature transformers, scalers, and explainability artifacts for the **CardioVista** CAD detection and multi-vessel stenosis risk prediction pipeline.

---

## 1. Directory Overview & Artifact Inventory

Once trained via the backend training pipeline (`python -m backend.train` or `notebooks/train_pipeline.ipynb`), the following serialization files reside here:

| File Name | Format | Target / Purpose | Primary Algorithm |
| :--- | :--- | :--- | :--- |
| `cad_overall_classifier.joblib` | Joblib | Overall CAD Status (`Cath` = CAD vs Normal) | Gradient Boosting / XGBoost / Random Forest |
| `lad_stenosis_model.joblib` | Joblib | LAD Stenosis ($\ge 50\%$ narrowing) | LightGBM / Random Forest |
| `lcx_stenosis_model.joblib` | Joblib | LCX Stenosis ($\ge 50\%$ narrowing) | LightGBM / Random Forest |
| `rca_stenosis_model.joblib` | Joblib | RCA Stenosis ($\ge 50\%$ narrowing) | LightGBM / Random Forest |
| `preprocessor_pipeline.joblib` | Joblib | Feature imputation, one-hot/ordinal encoding & standard scaling | Scikit-Learn `ColumnTransformer` |
| `feature_metadata.json` | JSON | Feature names in exact input order, categorical levels, and mean values | JSON Metadata |
| `shap_explainer_cad.joblib` | Joblib | TreeExplainer model for real-time SHAP clinical attribution | `shap.TreeExplainer` |

---

## 2. Feature Input Contract & Leakage Prevention

> [!CRITICAL]
> **No Target Leakage**: When passing features to the inference engine or training pipelines, the four ground truth catheterization labels must NEVER be present in the feature matrix $X$:
> - `Cath` (Overall CAD status)
> - `LAD` (Left Anterior Descending stenosis)
> - `LCX` (Left Circumflex stenosis)
> - `RCA` (Right Coronary Artery stenosis)

The accepted input vector contains the remaining 55 clinical features defined in [`docs/feature_dictionary.md`](file:///mnt/c/Users/Admin/Documents/gokul/CAD-detection/docs/feature_dictionary.md).

---

## 3. Model Architecture & Evaluation Targets

Each model is evaluated using stratified 5-fold cross-validation with hyperparameter optimization:

1. **Overall CAD Classifier (`Cath`)**:
   - Target Metric: ROC-AUC $\ge 0.88$, F1-Score $\ge 0.85$, Recall $\ge 0.88$ (high clinical sensitivity prioritized).
2. **Left Anterior Descending (`LAD`)**:
   - Primary vessel supplying anterior left ventricle. High clinical priority.
3. **Left Circumflex (`LCX`)**:
   - Evaluated for posterolateral territory ischemia.
4. **Right Coronary Artery (`RCA`)**:
   - Evaluated for inferior and AV-nodal perfusion territory.

---

## 4. Retraining & Serialization Instructions

To retrain the complete suite of models from the dataset:

```bash
# From workspace root
python3 -m backend.pipeline.train \
    --data-path docs/extention\ of\ Z-Alizadeh\ sani\ dataset.xlsx \
    --output-dir backend/model_artifacts \
    --calibrate \
    --generate-shap
```

Upon successful completion, the script automatically tests artifact loadability and generates a timestamped evaluation report in `backend/model_artifacts/eval_metrics.json`.
