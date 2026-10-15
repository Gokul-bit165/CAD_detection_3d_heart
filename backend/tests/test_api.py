import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.features import FEATURES

client = TestClient(app)


def valid():
    return {"Age": 55, "Sex": "Male", "Weight": 80, "Length": 175, "BP": 130, "PR": 72}


def test_health_and_model_info():
    assert client.get("/api/v1/health").json()["status"] == "ok"
    assert client.get("/api/v1/model-info").json()["status"] in ("ready", "unavailable")


@pytest.mark.parametrize("col", ["LAD", "LCX", "RCA", "Cath"])
def test_targets_rejected(col):
    r = client.post("/api/v1/predictions", json={"features": {**valid(), col: "Normal"}})
    assert r.status_code == 422 and "leakage" in r.text.lower()


def test_unknown_and_out_of_range_rejected():
    assert client.post("/api/v1/predictions", json={"features": {**valid(), "Foo": 1}}).status_code == 422
    assert client.post("/api/v1/predictions", json={"features": {**valid(), "Age": 500}}).status_code == 422
    assert client.post("/api/v1/predictions", json={"features": {"Age": 50}}).status_code == 422


def _need_model():
    if client.get("/api/v1/model-info").json()["status"] != "ready":
        pytest.skip("trained ensemble or its ML dependencies are not available")


def test_prediction_roundtrip():
    _need_model()
    r = client.post("/api/v1/predictions", json={"features": valid()})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready" and body["provider"] == "trained"
    assert set(body["vessels"]) == {"LAD", "LCX", "RCA"} and body["overall"]["reliability"] == "good"
    assert body["inputs"]["BMI"] == 26.1
    got = client.get(f"/api/v1/predictions/{body['id']}").json()
    assert got["id"] == body["id"]
    assert any(p["id"] == body["id"] for p in client.get("/api/v1/predictions").json())
    assert client.get("/api/v1/predictions/nope").status_code == 404


def test_legacy_demo_rows_are_hidden():
    import sqlite3
    from app.database.store import get_store
    st = get_store()
    c = sqlite3.connect(st.path)
    c.execute("INSERT INTO predictions VALUES ('legacy1','2020-01-01T00:00:00','demo','mock','x','{}')")
    c.commit(); c.close()
    assert client.get("/api/v1/predictions/legacy1").status_code == 404
    assert all(p["id"] != "legacy1" for p in client.get("/api/v1/predictions").json())


def test_feature_schema_has_no_targets():
    names = {f["name"] for f in client.get("/api/v1/features").json()["features"]}
    assert not names & {"LAD", "LCX", "RCA", "Cath"} and len(names) == len(FEATURES)


def test_trained_provider_unavailable_without_artifacts(tmp_path):
    from app.predictors.trained import TrainedModelProvider
    p = TrainedModelProvider(tmp_path)
    assert p.info().status == "unavailable"
    r = p.predict({"Age": 55.0})
    assert r.status == "unavailable" and r.overall is None and r.vessels is None


def test_evaluation_not_connected_without_report():
    body = client.get("/api/v1/evaluation").json()
    assert body["available"] is False or body["report"] is not None


def test_trained_provider_with_real_artifacts():
    """Runs only when the exported ensemble and its ML dependencies are present."""
    import pytest
    from pathlib import Path
    pytest.importorskip("joblib"), pytest.importorskip("sklearn"), pytest.importorskip("imblearn")
    art = Path(__file__).resolve().parents[1] / "model_artifacts"
    if not (art / "ensemble_bundle.joblib").is_file():
        pytest.skip("ensemble artifacts not exported")
    from app.predictors.trained import TrainedModelProvider
    from app.schemas.features import validate_features
    p = TrainedModelProvider(art)
    assert p.info().status == "ready"
    f = validate_features({"Age": 62, "Sex": "Male", "Weight": 80, "Length": 172, "BP": 140, "PR": 76})
    r = p.predict(f)  # optional inputs blank -> filled with training medians
    assert r.status == "ready" and 0 <= r.overall.probability <= 1
    assert set(r.vessels) == {"LAD", "LCX", "RCA"} and r.overall.reliability == "good"


def _xlsx(headers, *rows):
    import io
    from openpyxl import Workbook
    wb = Workbook(); ws = wb.active; ws.append(headers)
    for r in rows: ws.append(r)
    b = io.BytesIO(); wb.save(b); return b.getvalue()


def _upload(content, name="p.xlsx"):
    return client.post("/api/v1/import/excel", files={"file": (name, content, "application/octet-stream")})


def test_import_template_round_trips():
    t = client.get("/api/v1/import/template")
    assert t.status_code == 200
    r = _upload(t.content)
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert len(rows) == 1 and rows[0]["errors"] == [] and rows[0]["features"]["Age"] == 62
    assert rows[0]["features"]["BMI"] == 27.0 and r.json()["ignored_outcome_columns"] == []


def test_import_ignores_outcome_columns_and_reports_row_errors():
    data = _xlsx(["Age", "Sex", "Weight", "Length", "BP", "PR", "DM", "VHD", "Cath", "LAD", "Foo"],
                 [55, "Fmale", 70, 165, 120, 70, "Y", "Moderate", "Cad", "Stenotic", 1],
                 [999, "Male", 70, 165, 120, 70, 0, "N", "Normal", "Normal", 2],
                 [None] * 11)  # blank rows are skipped
    body = _upload(data).json()
    assert body["ignored_outcome_columns"] == ["Cath", "LAD"] and body["ignored_unknown_columns"] == ["Foo"]
    ok, bad = body["rows"]
    assert ok["errors"] == [] and ok["features"]["Sex"] == "Female" and ok["features"]["DM"] is True
    assert ok["features"]["VHD"] == "moderate" and "Cath" not in ok["features"] and "LAD" not in ok["features"]
    assert bad["features"] is None and any("Age" in e for e in bad["errors"]) and bad["row"] == 3


def test_import_rejects_bad_files():
    assert _upload(b"hello", "x.csv").status_code == 400
    assert _upload(b"not a workbook").status_code == 422  # .xlsx name, corrupt content
    assert _upload(_xlsx(["foo", "bar"], [1, 2])).status_code == 422


def test_import_returns_outcomes_for_scoring_only():
    data = _xlsx(["Age", "Sex", "Weight", "Length", "BP", "PR", "Cath", "LAD", "LCX", "RCA"],
                 [60, "Male", 80, 175, 130, 70, "Cad", "Stenotic", "Normal", "Normal"])
    row = _upload(data).json()["rows"][0]
    assert row["outcomes"] == {"Cath": True, "LAD": True, "LCX": False, "RCA": False}
    assert not {"Cath", "LAD", "LCX", "RCA"} & set(row["features"])


def test_shipped_test_workbook_scores_as_documented():
    from pathlib import Path
    wb = Path(__file__).resolve().parents[2] / "docs" / "test_data" / "cardiovista_test_patients.xlsx"
    if not wb.is_file():
        pytest.skip("test workbook not generated")
    _need_model()
    rows = _upload(wb.read_bytes()).json()["rows"]
    assert len(rows) == 61 and all(not r["errors"] for r in rows)
    hit = 0
    for r in rows:
        out = client.post("/api/v1/predictions", json={"features": r["features"]}).json()["overall"]
        hit += (out["predicted_class"] == "positive") == r["outcomes"]["Cath"]
    assert hit / 61 > 0.85  # documented held-out accuracy is 0.885
