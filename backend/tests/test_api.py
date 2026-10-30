from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app import elexon, main
from app.models import Actual, Forecast

client = TestClient(main.app)
D = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)


def fake_data(monkeypatch):
    monkeypatch.setattr(elexon, "fetch_actuals", lambda a, b: [Actual(D, 1000), Actual(D + timedelta(minutes=30), 1200)])
    forecasts = [
        Forecast(D, datetime(2026, 1, 4, 8, 0, tzinfo=timezone.utc), 900),
        Forecast(D, datetime(2026, 1, 5, 7, 0, tzinfo=timezone.utc), 1100),
    ]
    monkeypatch.setattr(elexon, "fetch_forecasts", lambda a, b: forecasts)


def test_horizon_mode_by_default(monkeypatch):
    fake_data(monkeypatch)
    body = client.get("/api/timeseries", params={"start": "2026-01-05", "end": "2026-01-05", "horizon": 4}).json()
    assert body["mode"] == "horizon" and body["horizon"] == 4 and body["cutoff"] is None
    assert body["points"][0]["forecast"] == 1100  # published 5 h before


def test_day_ahead_mode(monkeypatch):
    fake_data(monkeypatch)
    body = client.get(
        "/api/timeseries",
        params={"start": "2026-01-05T00:00:00Z", "end": "2026-01-05T23:30:00Z", "mode": "dayahead", "cutoff": "09:00"},
    ).json()
    assert body["mode"] == "dayahead" and body["cutoff"] == "09:00" and body["horizon"] is None
    assert [p["forecast"] for p in body["points"]] == [900, 900]
    assert body["metrics"]["coverage"] == 1


def test_bad_parameters_are_rejected(monkeypatch):
    fake_data(monkeypatch)
    assert client.get("/api/timeseries", params={"mode": "weekly"}).status_code == 422
    assert client.get("/api/timeseries", params={"mode": "dayahead", "cutoff": "25:99"}).status_code == 422
    assert client.get("/api/timeseries", params={"horizon": 49}).status_code == 422
