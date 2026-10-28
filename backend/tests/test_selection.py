from datetime import datetime, timedelta, timezone

from app.models import Forecast
from app.selection import hour_floor, select_latest_forecasts

T = datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc)


def fc(hours_before, value, target=T):
    return Forecast(target, target - timedelta(hours=hours_before), value)


def test_picks_latest_forecast_that_is_old_enough():
    forecasts = [fc(30, 100), fc(10, 200), fc(5, 300), fc(2, 400)]
    chosen = select_latest_forecasts(forecasts, horizon_hours=4)
    assert chosen[T].generation == 300  # 5 h before is the latest with >= 4 h lead


def test_forecast_exactly_at_horizon_is_allowed():
    chosen = select_latest_forecasts([fc(4, 111)], horizon_hours=4)
    assert chosen[T].generation == 111


def test_forecast_published_too_late_is_ignored():
    assert select_latest_forecasts([fc(3.5, 111)], horizon_hours=4) == {}


def test_horizon_zero_allows_forecast_at_target_time():
    chosen = select_latest_forecasts([fc(0, 5), fc(6, 9)], horizon_hours=0)
    assert chosen[T].generation == 5


def test_forecasts_older_than_48_hours_are_ignored():
    forecasts = [fc(49, 1), fc(60, 2)]
    assert select_latest_forecasts(forecasts, horizon_hours=4) == {}
    # 48 h exactly is still fine
    assert select_latest_forecasts([fc(48, 7)], horizon_hours=4)[T].generation == 7


def test_future_publish_times_are_never_used():
    # publishTime after the target (negative horizon) must not leak in
    assert select_latest_forecasts([fc(-2, 9)], horizon_hours=0) == {}


def test_each_target_time_is_handled_separately():
    t2 = T + timedelta(hours=1)
    forecasts = [fc(6, 10), fc(6, 20, target=t2), fc(2, 99, target=t2)]
    chosen = select_latest_forecasts(forecasts, horizon_hours=4)
    assert chosen[T].generation == 10
    assert chosen[t2].generation == 20


def test_larger_horizon_uses_older_forecast():
    forecasts = [fc(30, 1), fc(12, 2), fc(3, 3)]
    assert select_latest_forecasts(forecasts, 1)[T].generation == 3
    assert select_latest_forecasts(forecasts, 6)[T].generation == 2
    assert select_latest_forecasts(forecasts, 24)[T].generation == 1


def test_hour_floor():
    t = datetime(2026, 1, 10, 12, 30, tzinfo=timezone.utc)
    assert hour_floor(t) == T
