from datetime import datetime, timedelta, timezone

from app import service
from app.models import Actual, Forecast

D = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)


def test_parse_dates():
    assert service.parse_input_time("2026-01-05") == datetime(2026, 1, 5, 0, 0, tzinfo=timezone.utc)
    assert service.parse_input_time("2026-01-05", end_of_day=True) == datetime(
        2026, 1, 5, 23, 30, tzinfo=timezone.utc
    )
    assert service.parse_input_time("2026-01-05T10:00:00Z").hour == 10


def test_clamp_to_january_2026():
    s, e = service.clamp_range(
        datetime(2025, 12, 1, tzinfo=timezone.utc), datetime(2026, 3, 1, tzinfo=timezone.utc)
    )
    assert s == service.RANGE_START
    assert e == service.RANGE_END


def test_half_hour_actuals_share_the_hourly_forecast():
    actuals = [Actual(D, 1000), Actual(D + timedelta(minutes=30), 1100)]
    forecasts = [Forecast(D, D - timedelta(hours=6), 900)]
    points = service.build_points(actuals, forecasts, horizon_hours=4)
    assert [p["forecast"] for p in points] == [900, 900]
    assert points[0]["horizonHours"] == 6
    assert points[0]["publishTime"] == "2026-01-05T06:00:00Z"


def test_missing_forecast_gives_none():
    points = service.build_points([Actual(D, 1000)], [], horizon_hours=4)
    assert points[0]["forecast"] is None and points[0]["horizonHours"] is None


def test_day_ahead_points_use_the_cutoff_forecast_and_report_decision_time():
    from datetime import time

    target = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)
    forecasts = [
        Forecast(target, datetime(2026, 1, 4, 8, 0, tzinfo=timezone.utc), 800),
        Forecast(target, datetime(2026, 1, 4, 10, 0, tzinfo=timezone.utc), 950),  # after 09:00
        Forecast(target, datetime(2026, 1, 5, 6, 0, tzinfo=timezone.utc), 990),  # same day
    ]
    points = service.build_points([Actual(target, 1000)], forecasts, 4, "dayahead", time(9, 0))
    assert points[0]["forecast"] == 800
    assert points[0]["publishTime"] == "2026-01-04T08:00:00Z"
    assert points[0]["decisionTime"] == "2026-01-04T09:00:00Z"
    later = service.build_points([Actual(target, 1000)], forecasts, 4, "dayahead", time(11, 0))
    assert later[0]["forecast"] == 950


def test_normalise_mode():
    import pytest

    assert service.normalise_mode("Day-Ahead") == "dayahead"
    assert service.normalise_mode("day_ahead") == "dayahead"
    assert service.normalise_mode("horizon") == "horizon"
    with pytest.raises(ValueError):
        service.normalise_mode("weekly")
