"""Small client for the Elexon BMRS open data API (no API key needed)."""
import threading
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from .models import Actual, Forecast

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
CACHE_SECONDS = 6 * 60 * 60  # past data does not change, so a long cache is fine

_cache: dict[tuple, tuple[float, Any]] = {}
_lock = threading.Lock()


class ElexonError(Exception):
    """Raised when Elexon cannot be reached or returns something odd."""


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_json(dataset: str, params: dict[str, str]) -> list[dict]:
    url = f"{BASE_URL}/{dataset}/stream"
    try:
        transport = httpx.HTTPTransport(retries=2)
        with httpx.Client(timeout=30, transport=transport) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise ElexonError(f"Could not load {dataset} from Elexon: {exc}") from exc
    if not isinstance(data, list):
        raise ElexonError(f"Unexpected response for {dataset}")
    return data


def _cached(key: tuple, loader):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < CACHE_SECONDS:
            return hit[1]
    value = loader()
    with _lock:
        _cache[key] = (now, value)
    return value


def clear_cache() -> None:
    with _lock:
        _cache.clear()


def fetch_actuals(date_from: str, date_to: str) -> list[Actual]:
    """National wind actuals (FUELHH, half-hourly). Dates are YYYY-MM-DD, inclusive."""

    def load() -> list[Actual]:
        rows = _get_json(
            "FUELHH",
            {
                "settlementDateFrom": date_from,
                "settlementDateTo": date_to,
                "fuelType": "WIND",
            },
        )
        out = [
            Actual(parse_time(r["startTime"]), float(r["generation"]))
            for r in rows
            if r.get("fuelType") == "WIND" and r.get("generation") is not None
        ]
        out.sort(key=lambda a: a.start_time)
        return out

    return _cached(("FUELHH", date_from, date_to), load)


def fetch_forecasts(publish_from: datetime, publish_to: datetime) -> list[Forecast]:
    """National wind forecasts (WINDFOR, hourly) published in the given window."""

    def load() -> list[Forecast]:
        rows = _get_json(
            "WINDFOR",
            {
                "publishDateTimeFrom": _iso(publish_from),
                "publishDateTimeTo": _iso(publish_to),
            },
        )
        return [
            Forecast(
                parse_time(r["startTime"]),
                parse_time(r["publishTime"]),
                float(r["generation"]),
            )
            for r in rows
            if r.get("generation") is not None
        ]

    return _cached(("WINDFOR", _iso(publish_from), _iso(publish_to)), load)
