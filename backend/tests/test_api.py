import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.features import FEATURES

client = TestClient(app)


def valid():
    return {"Age": 55, "Sex": "Male", "Weight": 80, "Length": 175, "BP": 130, "PR": 72}


def test_health_and_model_info():
    assert client.get("/api/v1/health").json()["status"] == "ok"
    assert client.get("/api/v1/model-info").json()["status"] in ("demo", "ready", "unavailable")


@pytest.mark.parametrize("col", ["LAD", "LCX", "RCA", "Cath"])
def test_targets_rejected(col):
    r = client.post("/api/v1/predictions", json={"features": {**valid(), col: "Normal"}})
    assert r.status_code == 422 and "leakage" in r.text.lower()


def test_unknown_and_out_of_range_rejected():
    assert client.post("/api/v1/predictions", json={"features": {**valid(), "Foo": 1}}).status_code == 422
    assert client.post("/api/v1/predictions", json={"features": {**valid(), "Age": 500}}).status_code == 422
    assert client.post("/api/v1/predictions", json={"features": {"Age": 50}}).status_code == 422


def test_demo_prediction_roundtrip():
    r = client.post("/api/v1/predictions", json={"features": valid()})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "demo" and body["overall"]["illustrative"] is True
    assert set(body["vessels"]) == {"LAD", "LCX", "RCA"}
    assert body["inputs"]["BMI"] == 26.1
    got = client.get(f"/api/v1/predictions/{body['id']}").json()
    assert got["id"] == body["id"]
    assert any(p["id"] == body["id"] for p in client.get("/api/v1/predictions").json())
    assert client.get("/api/v1/predictions/nope").status_code == 404


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
