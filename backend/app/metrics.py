"""Forecast accuracy metrics. Pure Python, no extra packages."""
import math
from collections.abc import Sequence
from typing import Optional


def percentile(sorted_values: Sequence[float], q: float) -> float:
    """q-th percentile (0..1) with linear interpolation. Input must be sorted."""
    if not sorted_values:
        raise ValueError("no values")
    pos = q * (len(sorted_values) - 1)
    lo = math.floor(pos)
    hi = math.ceil(pos)
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (pos - lo)


def compute_metrics(
    pairs: Sequence[tuple[float, Optional[float]]],
) -> dict:
    """Metrics from (actual, forecast) pairs. forecast may be None.

    Only pairs that have both values are used for the error numbers.
    coverage = share of actual points that have a forecast.
    """
    total = len(pairs)
    both = [(a, f) for a, f in pairs if a is not None and f is not None]
    coverage = len(both) / total if total else 0.0
    if not both:
        return {
            "meanActual": None,
            "meanForecast": None,
            "difference": None,
            "mae": None,
            "rmse": None,
            "p90AbsError": None,
            "coverage": coverage,
            "count": 0,
        }
    n = len(both)
    mean_actual = sum(a for a, _ in both) / n
    mean_forecast = sum(f for _, f in both) / n
    errors = [f - a for a, f in both]
    abs_errors = sorted(abs(e) for e in errors)
    return {
        "meanActual": mean_actual,
        "meanForecast": mean_forecast,
        "difference": mean_forecast - mean_actual,
        "mae": sum(abs_errors) / n,
        "rmse": math.sqrt(sum(e * e for e in errors) / n),
        "p90AbsError": percentile(abs_errors, 0.9),
        "coverage": coverage,
        "count": n,
    }
