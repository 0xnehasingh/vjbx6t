"""Join actuals and forecasts and build the API answer."""
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from . import elexon
from .metrics import compute_metrics
from .models import Actual, Forecast
from .selection import MAX_HORIZON_HOURS, hour_floor, select_latest_forecasts

# The app only covers January 2026 (UTC).
RANGE_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
RANGE_END = datetime(2026, 1, 31, 23, 30, tzinfo=timezone.utc)  # last half-hour


def clamp_range(start: datetime, end: datetime) -> tuple[datetime, datetime]:
    start = min(max(start, RANGE_START), RANGE_END)
    end = min(max(end, RANGE_START), RANGE_END)
    if end < start:
        end = start
    return start, end


def parse_input_time(value: str, end_of_day: bool = False) -> datetime:
    """Accept 2026-01-05 or 2026-01-05T12:00:00Z. Date-only means the whole day."""
    value = value.strip()
    if len(value) == 10:
        d = date.fromisoformat(value)
        t = time(23, 30) if end_of_day else time(0, 0)
        return datetime.combine(d, t, tzinfo=timezone.utc)
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def build_points(
    actuals: list[Actual],
    forecasts: list[Forecast],
    horizon_hours: float,
) -> list[dict]:
    """One point per half-hour actual, with the selected hourly forecast."""
    selected = select_latest_forecasts(forecasts, horizon_hours, MAX_HORIZON_HOURS)
    points = []
    for a in actuals:
        f = selected.get(hour_floor(a.start_time))
        points.append(
            {
                "startTime": a.start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "actual": a.generation,
                "forecast": f.generation if f else None,
                "publishTime": f.publish_time.strftime("%Y-%m-%dT%H:%M:%SZ") if f else None,
                "horizonHours": round(f.horizon_hours, 2) if f else None,
            }
        )
    return points


def get_timeseries(start: datetime, end: datetime, horizon_hours: float) -> dict:
    start, end = clamp_range(start, end)
    actuals_all = elexon.fetch_actuals("2026-01-01", "2026-01-31")
    # Forecasts used for January targets can be published up to 48 h earlier.
    forecasts_all = elexon.fetch_forecasts(
        RANGE_START - timedelta(hours=MAX_HORIZON_HOURS + 24),
        RANGE_END + timedelta(minutes=30) - timedelta(seconds=1),
    )
    actuals = [a for a in actuals_all if start <= a.start_time <= end]
    points = build_points(actuals, forecasts_all, horizon_hours)
    metrics = compute_metrics([(p["actual"], p["forecast"]) for p in points])
    return {
        "start": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "horizon": horizon_hours,
        "points": points,
        "metrics": metrics,
    }
