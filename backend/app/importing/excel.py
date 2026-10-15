"""Excel (.xlsx) import of patient rows.

Reads the Z-Alizadeh Sani layout (one patient per row, dataset column names in the header) as
well as the template served by GET /import/template. Cells are normalised to the API encoding,
then validated by the same `validate_features` used for the form, so an imported row is held
to exactly the same rules as a typed one.

Ground-truth / cath-derived columns (Cath, LAD, LCX, RCA, ...) are ignored and reported, never
used: a real dataset sheet contains them, and the model must not see them.
"""
from __future__ import annotations

import io
from typing import Any

from openpyxl import Workbook, load_workbook

from ..schemas.features import FEATURES, FORBIDDEN_COLUMNS, FeatureSpec, validate_features

MAX_ROWS = 500
MAX_BYTES = 5 * 1024 * 1024
_ALIASES = {"fmale": "Female", "female": "Female", "f": "Female", "male": "Male", "m": "Male"}
_NOT_INPUT = {"BMI", "Exertional CP"}  # BMI is derived; Exertional CP is constant in the training data
_OUTCOMES = {"cath": "Cath", "lad": "LAD", "lcx": "LCX", "rca": "RCA"}
_POSITIVE = {"cad", "stenotic", "1", "y", "yes", "true", "positive"}
_NEGATIVE = {"normal", "0", "n", "no", "false", "negative"}
_LEAK_LOWER = {c.lower() for c in FORBIDDEN_COLUMNS} | {"cath_original", "label_corrected", "n_vessels"}


class ImportFileError(ValueError):
    """The file as a whole cannot be used (as opposed to a single bad row)."""


def _norm_header(h: Any) -> str:
    return " ".join(str(h).split()).lower() if h is not None else ""


_BY_HEADER = {_norm_header(f.name): f for f in FEATURES}


def _cell(spec: FeatureSpec, v: Any) -> Any:
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, str):
        v = v.strip()
    if spec.kind == "number":
        return v
    if spec.kind == "binary":
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return bool(v) if v in (0, 1) else v
        return v
    if spec.name == "Sex":
        return _ALIASES.get(str(v).lower(), v)
    if spec.kind == "ordinal":
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return v
    for o in spec.options or []:  # categorical: case-insensitive match on value or dataset value
        if str(v).lower() in {str(o.value).lower(), str(o.dataset_value).lower()}:
            return o.value
    return v


def _outcome(v: Any) -> bool | None:
    t = str(v).strip().lower() if v is not None else ""
    return True if t in _POSITIVE else False if t in _NEGATIVE else None


def parse_workbook(data: bytes) -> dict[str, Any]:
    if len(data) > MAX_BYTES:
        raise ImportFileError(f"File is larger than {MAX_BYTES // (1024 * 1024)} MB.")
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001 - corrupt / not an xlsx
        raise ImportFileError("Could not read the file. Upload a valid .xlsx workbook.") from exc

    best: tuple[str, list[tuple], int] | None = None
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            continue
        hits = sum(1 for h in rows[0] if _norm_header(h) in _BY_HEADER)
        if hits >= 3 and (best is None or hits > best[2]):
            best = (ws.title, rows, hits)
    if best is None:
        raise ImportFileError("No sheet has a header row with the patient feature names (e.g. Age, Sex, BP, FBS). "
                              "Download the template for the expected layout.")
    sheet, rows, _ = best
    header = rows[0]
    cols = {i: _BY_HEADER[_norm_header(h)] for i, h in enumerate(header) if _norm_header(h) in _BY_HEADER}
    out_cols = {i: _OUTCOMES[_norm_header(h)] for i, h in enumerate(header) if _norm_header(h) in _OUTCOMES}
    leak = sorted({str(h) for h in header if _norm_header(h) in _LEAK_LOWER})
    other = [str(h) for h in header
             if h is not None and _norm_header(h) not in _BY_HEADER and _norm_header(h) not in _LEAK_LOWER]

    body = [r for r in rows[1:] if any(c is not None and str(c).strip() for c in r)]
    if len(body) > MAX_ROWS:
        raise ImportFileError(f"The sheet has {len(body)} patient rows; the limit is {MAX_ROWS} per upload.")
    out_rows = []
    for n, r in enumerate(body, start=2):  # Excel row number (1 = header)
        raw = {spec.name: _cell(spec, r[i] if i < len(r) else None)
               for i, spec in cols.items() if spec.name not in _NOT_INPUT}
        errors: list[str] = []
        features = None
        try:
            features = validate_features(raw)
        except ValueError as exc:
            errors = [e.strip() for e in str(exc).split(";") if e.strip()]
        # Known outcomes, if the sheet has them, are only returned so predictions can be scored afterwards.
        outcomes = {name: _outcome(r[i]) for i, name in out_cols.items() if i < len(r) and _outcome(r[i]) is not None}
        out_rows.append({"row": n, "features": features, "errors": errors, "outcomes": outcomes or None})
    present = {s.name for s in cols.values()}
    return {
        "sheet": sheet, "rows": out_rows,
        "ignored_outcome_columns": leak,  # present in the file, deliberately not used
        "ignored_unknown_columns": other,
        "missing_columns": [f.name for f in FEATURES if f.name not in _NOT_INPUT and f.name not in present],
    }


def template_bytes() -> bytes:
    cols = [f for f in FEATURES if f.name not in _NOT_INPUT]
    wb = Workbook()
    ws = wb.active
    ws.title = "Patients"
    ws.append([f.name for f in cols])
    ex = {"Age": 62, "Sex": "Male", "Weight": 80, "Length": 172, "BP": 140, "PR": 76}
    ws.append([ex.get(f.name) for f in cols])
    ws2 = wb.create_sheet("Legend")
    ws2.append(["Column", "Meaning", "Allowed values / unit", "Required"])
    for f in cols:
        allowed = ", ".join(str(o.value) for o in f.options) if f.options else (f.unit or "")
        ws2.append([f.name, f.label, allowed, "yes" if f.required else "no (blank = training median)"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
