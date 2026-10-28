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
