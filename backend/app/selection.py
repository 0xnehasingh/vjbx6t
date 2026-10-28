"""Pick the forecast a trader could really have used at decision time."""
from collections.abc import Iterable
from datetime import datetime, timedelta, timezone

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
