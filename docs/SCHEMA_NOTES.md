# Input schema notes

The patient form and the API validator are generated from one list:
[`backend/app/schemas/features.py`](../backend/app/schemas/features.py), served at `GET /api/v1/features`.
It was built from `docs/dataset_columns.csv` and `docs/feature_dictionary.md`, then cross-checked against the
values actually present in `docs/extention of Z-Alizadeh sani dataset.xlsx` (sheet `Sheet 1 - Table 1`, 303 rows).
The spreadsheet is only read locally for this check; it is never served to the browser.

## Target leakage

`LAD`, `LCX`, `RCA`, `Cath` are rejected by the API (HTTP 422, "Target leakage …") and are absent from the form.
The wider, header-only `Sheet1` of the spreadsheet also lists catheterization-derived columns
(`LAD Proximal`, `Number of Vessel Involved`, `EF- Cath`, …). They are outcome information and are rejected the same way.

## Discrepancies between the dictionary and the spreadsheet (unresolved)

| Item | Dictionary says | Spreadsheet contains | What the app does |
| :--- | :--- | :--- | :--- |
| Binary encodings | Several are documented as `0/1` | 11 columns are `0/1`; 18 are `N/Y` (e.g. `Weak Peripheral Pulse`, `Lung rales`, `LVH`) | API takes booleans. Each feature records its `dataset_encoding`; `TrainedModelProvider` maps back. |
| `Sex` | `Male` / `Female` | `Male` / `Fmale` | API accepts `Female`, maps to `Fmale`. |
| `Function Class` | NYHA 1–4 | values 0–3 only | Form offers 0–3 as in the data. **Needs a decision from the ML owner.** |
| `VHD` | `N`, `mild`, `moderate`, `severe` | `N`, `mild`, `Moderate`, `Severe` | API uses lowercase; mapped back. |
| `Exertional CP` | binary | `N` in every row (constant) | Kept in the form; a trained model cannot learn from it. |
| Target class label | `Stenosis` | `Stenotic` | Display text only. |
| `BMI` | input | derived from weight/height | Calculated; a supplied value inconsistent by > 1.0 is rejected. |

## Requested groups that are not supported

The brief asked for medications and exercise testing / myocardial perfusion imaging. They appear only as header names in the
empty `Sheet1` (`Beta blocker`, `Statin`, `METS`, `Peak HR`, MPI regions, …): no data and no dictionary entry. They are **not**
in the form. Add them to `features.py` once the ML owner confirms they are model inputs.

## Validation bounds

- `hard_min` / `hard_max`: physiological sanity limits chosen for this app (not from the dictionary). Values outside are rejected.
- `observed_min` / `observed_max`: range present in the spreadsheet. Values outside only produce a warning in the UI.
- Optional fields (labs, echo, most binaries) may be omitted; the trained pipeline's imputer is responsible for them.
  Binary findings in the form default to "No", which is an assumption the review screen asks the user to confirm.
