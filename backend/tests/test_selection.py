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


# ---- day-ahead mode ----
from datetime import time  # noqa: E402

import pytest  # noqa: E402

from app.selection import day_ahead_cutoff, parse_cutoff, select_day_ahead_forecasts  # noqa: E402

TARGET = datetime(2026, 1, 10, 15, 0, tzinfo=timezone.utc)  # day D = 10 Jan, so D-1 = 9 Jan


def pub(day, hour, minute, value, target=TARGET):
    return Forecast(target, datetime(2026, 1, day, hour, minute, tzinfo=timezone.utc), value)


def test_day_ahead_cutoff_is_previous_day():
    assert day_ahead_cutoff(TARGET, time(9, 0)) == datetime(2026, 1, 9, 9, 0, tzinfo=timezone.utc)
    midnight = datetime(2026, 1, 10, 0, 0, tzinfo=timezone.utc)
    assert day_ahead_cutoff(midnight, time(9, 0)) == datetime(2026, 1, 9, 9, 0, tzinfo=timezone.utc)


def test_day_ahead_picks_latest_forecast_at_or_before_cutoff():
    forecasts = [pub(9, 3, 0, 1), pub(9, 8, 30, 2), pub(9, 9, 0, 3), pub(9, 9, 30, 4), pub(10, 6, 0, 5)]
    chosen = select_day_ahead_forecasts(forecasts, time(9, 0))
    assert chosen[TARGET].generation == 3  # 09:00 exactly is allowed, 09:30 is too late


def test_day_ahead_ignores_forecasts_published_on_the_delivery_day():
    assert select_day_ahead_forecasts([pub(10, 0, 0, 9)], time(9, 0)) == {}


def test_day_ahead_cutoff_can_be_changed():
    forecasts = [pub(9, 8, 30, 2), pub(9, 11, 0, 7), pub(9, 14, 0, 8)]
    assert select_day_ahead_forecasts(forecasts, time(12, 0))[TARGET].generation == 7
    assert select_day_ahead_forecasts(forecasts, time(8, 0)) == {}


def test_day_ahead_still_ignores_forecasts_older_than_48_hours():
    old = pub(7, 12, 0, 1)  # 51 h before the target
    assert select_day_ahead_forecasts([old], time(9, 0)) == {}
    ok = pub(8, 15, 0, 2)  # exactly 48 h before the target
    assert select_day_ahead_forecasts([old, ok], time(9, 0))[TARGET].generation == 2


def test_day_ahead_targets_on_the_same_day_share_one_cutoff():
    t2 = datetime(2026, 1, 10, 23, 0, tzinfo=timezone.utc)
    forecasts = [pub(9, 8, 0, 10), pub(9, 8, 0, 20, target=t2), pub(9, 10, 0, 99, target=t2)]
    chosen = select_day_ahead_forecasts(forecasts, time(9, 0))
    assert chosen[TARGET].generation == 10
    assert chosen[t2].generation == 20


def test_parse_cutoff():
    assert parse_cutoff("09:00") == time(9, 0)
    assert parse_cutoff("17:30") == time(17, 30)
    for bad in ["9", "25:00", "09:60", "09:00:00", "abc", ""]:
        with pytest.raises(ValueError):
            parse_cutoff(bad)
