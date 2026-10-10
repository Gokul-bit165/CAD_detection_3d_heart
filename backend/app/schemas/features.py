"""Single source of truth for the patient input schema.

Derived from docs/dataset_columns.csv + docs/feature_dictionary.md, and cross-checked
against the column values actually present in the Z-Alizadeh Sani spreadsheet
(`Sheet 1 - Table 1`). Discrepancies between the dictionary and the spreadsheet are
listed in docs/SCHEMA_NOTES.md.

Served to the frontend through GET /api/v1/features so the form is generated from this
list; adding a feature here adds it to the form and to validation.

The four ground-truth angiography columns are NEVER valid inputs (target leakage).
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

Kind = Literal["number", "binary", "categorical", "ordinal"]
Group = Literal["demographics", "history", "symptoms", "exam", "ecg", "labs", "echo"]

# Targets named by the challenge PDF (requirement 1d) - must never be model inputs.
TARGET_COLUMNS = ("LAD", "LCX", "RCA", "Cath")

# Columns that exist in the spreadsheet's wider (header-only) "Sheet1" and are derived
# from the catheterization procedure itself. They are outcome information, so they are
# rejected with the same leakage message as the four targets.
CATH_DERIVED_COLUMNS = (
    "LM Proximal", "LM Distal",
    "LAD Proximal", "LAD Mid", "LAD Distal",
    "LCX Proximal", "LCX Mid", "LCX Distal",
    "RCA Proximal", "RCA Mid", "RCA Distal",
    "Number of Vessel Involved", "EF- Cath", "Number Of lesion PCI",
)
FORBIDDEN_COLUMNS = TARGET_COLUMNS + CATH_DERIVED_COLUMNS

GROUP_LABELS: dict[str, str] = {
    "demographics": "Demographics & body measurements",
    "history": "Medical history & risk factors",
    "symptoms": "Symptoms & functional status",
    "exam": "Physical examination & vital signs",
    "ecg": "Resting ECG findings",
    "labs": "Laboratory measurements",
    "echo": "Echocardiography",
}

# Groups requested in the product brief that the verified dictionary does not support.
UNSUPPORTED_GROUPS = [
    {
        "group": "Medications",
        "reason": "Insulin, beta blocker, statin, etc. appear only as header names in the "
        "spreadsheet's empty 'Sheet1'; they have no data and no dictionary entry.",
    },
    {
        "group": "Exercise testing & myocardial perfusion imaging",
        "reason": "METS, Peak HR, MPI regions, etc. appear only as header names in the "
        "empty 'Sheet1'; they are not in docs/dataset_columns.csv or the feature dictionary.",
    },
]


class FeatureOption(BaseModel):
    value: str | int
    label: str
    # Value as stored in the training spreadsheet (what a preprocessing pipeline expects).
    dataset_value: str | int | None = None


class FeatureSpec(BaseModel):
    name: str  # exact dataset column name
    label: str
    group: Group
    kind: Kind
    unit: str | None = None
    description: str
    required: bool = False
    derived: bool = False  # computed server-side/client-side from other inputs
    hard_min: float | None = None  # reject outside (sanity bound, not from the dictionary)
    hard_max: float | None = None
    observed_min: float | None = None  # range seen in the training spreadsheet (warn only)
    observed_max: float | None = None
    step: float | None = None
    ref_range: str | None = None  # reference range quoted by the feature dictionary
    options: list[FeatureOption] | None = None
    dataset_encoding: Literal["Y/N", "0/1"] | None = None  # binary features only
    note: str | None = None


def _num(name, label, group, unit, desc, hmin, hmax, omin, omax, *, step=1.0, required=False,
         ref=None, derived=False, note=None) -> FeatureSpec:
    return FeatureSpec(name=name, label=label, group=group, kind="number", unit=unit,
                       description=desc, required=required, derived=derived, hard_min=hmin,
                       hard_max=hmax, observed_min=omin, observed_max=omax, step=step,
                       ref_range=ref, note=note)


def _bin(name, label, group, desc, enc: Literal["Y/N", "0/1"], *, note=None) -> FeatureSpec:
    return FeatureSpec(name=name, label=label, group=group, kind="binary", description=desc,
                       dataset_encoding=enc, note=note,
                       options=[FeatureOption(value="true", label="Yes", dataset_value="Y" if enc == "Y/N" else 1),
                                FeatureOption(value="false", label="No", dataset_value="N" if enc == "Y/N" else 0)])


FEATURES: list[FeatureSpec] = [
    # --- Demographics & body measurements -------------------------------------------
    _num("Age", "Age", "demographics", "years", "Patient age at clinical presentation", 18, 110, 30, 86, required=True),
    FeatureSpec(name="Sex", label="Biological sex", group="demographics", kind="categorical",
                description="Biological sex", required=True,
                options=[FeatureOption(value="Male", label="Male", dataset_value="Male"),
                         FeatureOption(value="Female", label="Female", dataset_value="Fmale")],
                note="The spreadsheet spells the female level 'Fmale'; the API accepts 'Female'."),
    _num("Weight", "Body weight", "demographics", "kg", "Total body weight", 20, 300, 48, 120, required=True),
    _num("Length", "Body height", "demographics", "cm", "Body height", 100, 230, 140, 188, required=True),
    _num("BMI", "Body mass index", "demographics", "kg/m²", "Weight / height² - calculated from weight and height",
         10, 70, 18.1, 40.9, step=0.1, derived=True),
    # --- Medical history & risk factors ---------------------------------------------
    _bin("DM", "Diabetes mellitus", "history", "History of diabetes mellitus", "0/1"),
    _bin("HTN", "Hypertension", "history", "History of hypertension", "0/1"),
    _bin("Current Smoker", "Current smoker", "history", "Current tobacco cigarette smoker", "0/1"),
    _bin("EX-Smoker", "Former smoker", "history", "Former cigarette smoker", "0/1"),
    _bin("FH", "Family history of premature CAD", "history", "First-degree relative with premature CAD", "0/1"),
    _bin("Obesity", "Obesity", "history", "Clinical diagnosis of obesity", "Y/N"),
    _bin("CRF", "Chronic renal failure", "history", "History of chronic renal failure", "Y/N"),
    _bin("CVA", "Cerebrovascular accident", "history", "Prior stroke / TIA", "Y/N"),
    _bin("Airway disease", "Airway disease", "history", "Chronic obstructive or reactive airway disease", "Y/N"),
    _bin("Thyroid Disease", "Thyroid disease", "history", "History of thyroid disorder", "Y/N"),
    _bin("CHF", "Congestive heart failure", "history", "History of congestive heart failure", "Y/N"),
    _bin("DLP", "Dyslipidemia", "history", "History of dyslipidemia", "Y/N"),
    # --- Symptoms & functional status -----------------------------------------------
    _bin("Typical Chest Pain", "Typical chest pain", "symptoms", "Typical exertional substernal angina", "0/1"),
    _bin("Dyspnea", "Dyspnea", "symptoms", "Shortness of breath on exertion or at rest", "Y/N"),
    FeatureSpec(name="Function Class", label="Functional class (NYHA)", group="symptoms", kind="ordinal",
                description="NYHA functional classification of cardiovascular limitation",
                options=[FeatureOption(value=i, label=l, dataset_value=i) for i, l in
                         [(0, "0 - none recorded"), (1, "Class I"), (2, "Class II"), (3, "Class III")]],
                note="Spreadsheet contains 0-3; the dictionary describes NYHA 1-4. Unresolved - see docs/SCHEMA_NOTES.md."),
    _bin("Atypical", "Atypical chest pain", "symptoms", "Chest pain meeting only two of three classic angina criteria", "Y/N"),
    _bin("Nonanginal", "Non-anginal chest pain", "symptoms", "Chest pain meeting fewer than two classic criteria", "Y/N"),
    _bin("Exertional CP", "Exertional chest pain", "symptoms", "Chest discomfort triggered by physical activity", "Y/N",
         note="Constant ('N') in every spreadsheet row, so a trained model cannot learn from it."),
    _bin("LowTH Ang", "Low-threshold angina", "symptoms", "Angina at minimal workload", "Y/N"),
    # --- Physical examination & vital signs -----------------------------------------
    _num("BP", "Systolic blood pressure", "exam", "mmHg", "Systolic blood pressure on admission", 50, 300, 90, 190, required=True),
    _num("PR", "Pulse rate", "exam", "bpm", "Resting pulse rate", 20, 250, 50, 110, required=True),
    _bin("Edema", "Peripheral edema", "exam", "Dependent peripheral edema", "0/1"),
    _bin("Weak Peripheral Pulse", "Weak peripheral pulse", "exam", "Diminished peripheral arterial pulses", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    _bin("Lung rales", "Lung rales", "exam", "Auscultatory pulmonary crackles", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    _bin("Systolic Murmur", "Systolic murmur", "exam", "Murmur during ventricular contraction", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    _bin("Diastolic Murmur", "Diastolic murmur", "exam", "Murmur during ventricular filling", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    # --- ECG --------------------------------------------------------------------------
    _bin("Q Wave", "Pathological Q wave", "ecg", "Pathological Q waves on resting ECG", "0/1"),
    _bin("St Elevation", "ST elevation", "ecg", "ST-segment elevation on resting ECG", "0/1"),
    _bin("St Depression", "ST depression", "ecg", "ST-segment depression on resting ECG", "0/1"),
    _bin("Tinversion", "T-wave inversion", "ecg", "Inverted T waves on resting ECG", "0/1"),
    _bin("LVH", "Left ventricular hypertrophy", "ecg", "LVH voltage criteria on resting ECG", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    _bin("Poor R Progression", "Poor R-wave progression", "ecg", "Poor R-wave progression across precordial leads", "Y/N",
         note="Dictionary lists 0/1; the spreadsheet stores N/Y."),
    FeatureSpec(name="BBB", label="Bundle branch block", group="ecg", kind="categorical",
                description="Bundle branch block on resting ECG",
                options=[FeatureOption(value="N", label="None", dataset_value="N"),
                         FeatureOption(value="LBBB", label="Left (LBBB)", dataset_value="LBBB"),
                         FeatureOption(value="RBBB", label="Right (RBBB)", dataset_value="RBBB")]),
    # --- Laboratory --------------------------------------------------------------------
    _num("FBS", "Fasting blood sugar", "labs", "mg/dL", "Fasting blood glucose", 20, 800, 62, 400, ref="70-99"),
    _num("CR", "Creatinine", "labs", "mg/dL", "Serum creatinine", 0.1, 20, 0.5, 2.2, step=0.1, ref="0.6-1.2"),
    _num("TG", "Triglycerides", "labs", "mg/dL", "Serum triglycerides", 10, 3000, 37, 1050, ref="< 150"),
    _num("LDL", "LDL cholesterol", "labs", "mg/dL", "Low-density lipoprotein", 5, 600, 18, 232, ref="< 100"),
    _num("HDL", "HDL cholesterol", "labs", "mg/dL", "High-density lipoprotein", 5, 200, 15.9, 111, step=0.1, ref="> 40 (M), > 50 (F)"),
    _num("BUN", "Blood urea nitrogen", "labs", "mg/dL", "Blood urea nitrogen", 1, 200, 6, 52, ref="7-20"),
    _num("ESR", "Erythrocyte sedimentation rate", "labs", "mm/hr", "Non-specific inflammatory marker", 0, 150, 1, 90, ref="0-20"),
    _num("HB", "Hemoglobin", "labs", "g/dL", "Hemoglobin concentration", 3, 25, 8.9, 17.6, step=0.1, ref="12.0-17.5"),
    _num("K", "Potassium", "labs", "mEq/L", "Serum potassium", 1.5, 9, 3, 6.6, step=0.1, ref="3.5-5.0"),
    _num("Na", "Sodium", "labs", "mEq/L", "Serum sodium", 100, 180, 128, 156, ref="135-145"),
    _num("WBC", "White blood cell count", "labs", "cells/µL", "White blood cell count", 500, 100000, 3700, 18000, step=100, ref="4,000-11,000"),
    _num("Lymph", "Lymphocytes", "labs", "%", "Lymphocyte differential", 0, 100, 7, 60, ref="20-40"),
    _num("Neut", "Neutrophils", "labs", "%", "Neutrophil differential", 0, 100, 32, 89, ref="40-70"),
    _num("PLT", "Platelet count", "labs", "×10³/µL", "Platelet count", 5, 2000, 25, 742, ref="150-450"),
    # --- Echocardiography --------------------------------------------------------------
    _num("EF-TTE", "Ejection fraction (TTE)", "echo", "%", "LV ejection fraction by transthoracic echo", 5, 85, 15, 60, ref="≥ 50"),
    FeatureSpec(name="Region RWMA", label="Regional wall motion abnormality", group="echo", kind="ordinal",
                description="Number of myocardial regions with wall-motion abnormality (0-4)",
                options=[FeatureOption(value=i, label=str(i), dataset_value=i) for i in range(5)]),
    FeatureSpec(name="VHD", label="Valvular heart disease", group="echo", kind="categorical",
                description="Valvular heart disease severity on Doppler echo",
                options=[FeatureOption(value="N", label="None", dataset_value="N"),
                         FeatureOption(value="mild", label="Mild", dataset_value="mild"),
                         FeatureOption(value="moderate", label="Moderate", dataset_value="Moderate"),
                         FeatureOption(value="severe", label="Severe", dataset_value="Severe")]),
]

FEATURE_BY_NAME: dict[str, FeatureSpec] = {f.name: f for f in FEATURES}

# Optional (non-required) features are sent as null/omitted; the trained pipeline's
# imputer is responsible for them. Defaults used by the UI for unselected categoricals:
UI_DEFAULTS: dict[str, Any] = {"BBB": "N", "VHD": "N", "Function Class": 0, "Region RWMA": 0}


def validate_features(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalise an inference input. Raises ValueError with all problems."""
    problems: list[str] = []

    leaked = [k for k in raw if k in FORBIDDEN_COLUMNS]
    if leaked:
        raise ValueError(
            "Target leakage: " + ", ".join(sorted(leaked)) +
            " are ground-truth angiography fields and are not permitted as model inputs."
        )
    unknown = [k for k in raw if k not in FEATURE_BY_NAME]
    if unknown:
        raise ValueError("Unknown feature(s): " + ", ".join(sorted(unknown)))

    out: dict[str, Any] = {}
    for spec in FEATURES:
        v = raw.get(spec.name)
        if v is None or v == "":
            if spec.required and not spec.derived:
                problems.append(f"{spec.name}: required")
            out[spec.name] = None
            continue
        try:
            out[spec.name] = _coerce(spec, v)
        except ValueError as e:
            problems.append(f"{spec.name}: {e}")

    # Derive BMI when possible, never trust an inconsistent supplied value silently.
    w, h = out.get("Weight"), out.get("Length")
    if w and h:
        calc = round(w / ((h / 100) ** 2), 1)
        if out.get("BMI") is not None and abs(out["BMI"] - calc) > 1.0:
            problems.append(f"BMI: {out['BMI']} is inconsistent with weight/height (calculated {calc})")
        else:
            out["BMI"] = calc
    elif out.get("BMI") is None:
        problems.append("BMI: cannot be derived without Weight and Length")

    if problems:
        raise ValueError("; ".join(problems))
    return out


def _coerce(spec: FeatureSpec, v: Any) -> Any:
    if spec.kind == "number":
        if isinstance(v, bool) or not isinstance(v, (int, float, str)):
            raise ValueError("must be a number")
        try:
            n = float(v)
        except ValueError:
            raise ValueError("must be a number") from None
        if n != n or n in (float("inf"), float("-inf")):
            raise ValueError("must be a finite number")
        if spec.hard_min is not None and n < spec.hard_min or spec.hard_max is not None and n > spec.hard_max:
            raise ValueError(f"{n:g} is outside the accepted range {spec.hard_min:g}-{spec.hard_max:g} {spec.unit or ''}".strip())
        return n
    if spec.kind == "binary":
        if isinstance(v, bool):
            return v
        if str(v).lower() in ("true", "y", "1", "yes"):
            return True
        if str(v).lower() in ("false", "n", "0", "no"):
            return False
        raise ValueError("must be true or false")
    allowed = {str(o.value): o.value for o in spec.options or []}
    if str(v) not in allowed:
        raise ValueError("must be one of " + ", ".join(allowed))
    return allowed[str(v)]
