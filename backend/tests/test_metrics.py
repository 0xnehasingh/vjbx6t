import math

import pytest

from app.metrics import compute_metrics, percentile


def test_basic_metrics():
    # errors (forecast - actual): +10, -20, +30, 0
    pairs = [(100, 110), (200, 180), (300, 330), (400, 400)]
    m = compute_metrics(pairs)
    assert m["meanActual"] == 250
    assert m["meanForecast"] == 255
    assert m["difference"] == 5
    assert m["mae"] == pytest.approx(15)
    assert m["rmse"] == pytest.approx(math.sqrt((100 + 400 + 900 + 0) / 4))
    assert m["coverage"] == 1
    assert m["count"] == 4


def test_p90_abs_error():
    pairs = [(0, e) for e in range(1, 11)]  # abs errors 1..10
    m = compute_metrics(pairs)
    assert m["p90AbsError"] == pytest.approx(9.1)


def test_missing_forecasts_reduce_coverage():
    pairs = [(100, 110), (100, None), (100, 90), (100, None)]
    m = compute_metrics(pairs)
    assert m["coverage"] == 0.5
    assert m["count"] == 2
    assert m["mae"] == 10


def test_no_forecasts_gives_empty_metrics():
    m = compute_metrics([(100, None), (200, None)])
    assert m["mae"] is None and m["rmse"] is None
    assert m["coverage"] == 0
    assert m["count"] == 0


def test_empty_input():
    m = compute_metrics([])
    assert m["coverage"] == 0 and m["meanActual"] is None


def test_rmse_is_not_smaller_than_mae():
    pairs = [(100, 150), (100, 90), (100, 100), (100, 160)]
    m = compute_metrics(pairs)
    assert m["rmse"] >= m["mae"]


def test_percentile_single_value():
    assert percentile([5.0], 0.9) == 5.0
