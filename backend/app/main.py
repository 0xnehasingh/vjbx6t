"""FastAPI app: health check and the wind time series."""
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import service
from .elexon import ElexonError

app = FastAPI(title="Wind Generation Forecast Monitor API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/timeseries")
def timeseries(
    start: str = Query("2026-01-01", description="Start date or datetime (UTC)"),
    end: str = Query("2026-01-07", description="End date or datetime (UTC)"),
    horizon: float = Query(4, ge=0, le=48, description="Forecast horizon in hours (0-48)"),
) -> dict:
    try:
        start_dt = service.parse_input_time(start)
        end_dt = service.parse_input_time(end, end_of_day=True)
    except ValueError:
        raise HTTPException(status_code=422, detail="start and end must be dates like 2026-01-05")
    try:
        return service.get_timeseries(start_dt, end_dt, horizon)
    except ElexonError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
