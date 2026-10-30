"""Pick the forecast a trader could really have used at decision time."""
from collections.abc import Iterable
from datetime import datetime, time, timedelta, timezone

from .models import Forecast

MAX_HORIZON_HOURS = 48


def select_latest_forecasts(
    forecasts: Iterable[Forecast],
    horizon_hours: float,
    max_horizon_hours: float = MAX_HORIZON_HOURS,
) -> dict[datetime, Forecast]:
    """For every target time, return the latest allowed forecast.

    A forecast for target time T (its startTime) is allowed when:
      * publishTime <= T - horizon_hours  (it was known in time), and
      * T - publishTime <= max_horizon_hours  (it is not older than 48 h).
    Among the allowed forecasts we keep the one with the latest publishTime.
    Target times with no allowed forecast are left out.
    """
    min_lead = timedelta(hours=horizon_hours)
    max_lead = timedelta(hours=max_horizon_hours)
    best: dict[datetime, Forecast] = {}
    for f in forecasts:
        lead = f.start_time - f.publish_time
        if lead < min_lead or lead > max_lead:
            continue
        current = best.get(f.start_time)
        if current is None or f.publish_time > current.publish_time:
            best[f.start_time] = f
    return best


def hour_floor(t: datetime) -> datetime:
    """Start of the hour that contains t (UTC)."""
    t = t.astimezone(timezone.utc)
    return t.replace(minute=0, second=0, microsecond=0)


DEFAULT_CUTOFF = time(9, 0)


def parse_cutoff(value: str) -> time:
    """Parse a cutoff such as "09:00" (HH:MM, 24 h clock). Raises ValueError if invalid."""
    parts = value.strip().split(":")
    if len(parts) != 2 or not all(p.isdigit() and len(p) == 2 for p in parts):
        raise ValueError("cutoff must look like 09:00")
    return time(int(parts[0]), int(parts[1]))


def day_ahead_cutoff(target: datetime, cutoff: time) -> datetime:
    """Decision time for a target: `cutoff` on the day before the target's day.

    In January the UK is on GMT, so UK local time and UTC are the same clock.
    """
    target = target.astimezone(timezone.utc)
    previous_day = (target - timedelta(days=1)).date()
    return datetime.combine(previous_day, cutoff, tzinfo=timezone.utc)


def select_day_ahead_forecasts(
    forecasts: Iterable[Forecast],
    cutoff: time = DEFAULT_CUTOFF,
    max_horizon_hours: float = MAX_HORIZON_HOURS,
) -> dict[datetime, Forecast]:
    """Day-ahead rule: for a target time on day D, use the latest forecast
    published at or before `cutoff` on day D-1.

    Forecasts older than `max_horizon_hours` before the target are still ignored.
    Targets with no allowed forecast are left out.
    """
    max_lead = timedelta(hours=max_horizon_hours)
    best: dict[datetime, Forecast] = {}
    for f in forecasts:
        if f.publish_time > day_ahead_cutoff(f.start_time, cutoff):
            continue
        if f.start_time - f.publish_time > max_lead:
            continue
        current = best.get(f.start_time)
        if current is None or f.publish_time > current.publish_time:
            best[f.start_time] = f
    return best
