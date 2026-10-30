"""FastAPI app: health check and the wind time series."""
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import service
from .elexon import ElexonError
from .selection import parse_cutoff

app = FastAPI(title="WindFlow API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/timeseries")
def timeseries(
    start: str = Query("2026-01-01", description="Start date or datetime (UTC)"),
    end: str = Query("2026-01-07", description="End date or datetime (UTC)"),
    horizon: float = Query(4, ge=0, le=48, description="Forecast horizon in hours (0-48). Used when mode=horizon"),
    mode: str = Query("horizon", description="horizon or dayahead"),
    cutoff: str = Query("09:00", description="Day-ahead decision time on the day before, HH:MM (UTC = UK time in January)"),
) -> dict:
    try:
        start_dt = service.parse_input_time(start)
        end_dt = service.parse_input_time(end, end_of_day=True)
    except ValueError:
        raise HTTPException(status_code=422, detail="start and end must be dates like 2026-01-05")
    try:
        mode_name = service.normalise_mode(mode)
        cutoff_time = parse_cutoff(cutoff)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    try:
        return service.get_timeseries(start_dt, end_dt, horizon, mode_name, cutoff_time)
    except ElexonError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/horizon-accuracy")
def horizon_accuracy(
    start: str = Query("2026-01-01", description="Start date or datetime (UTC)"),
    end: str = Query("2026-01-07", description="End date or datetime (UTC)"),
    cutoff: str = Query("09:00", description="Day-ahead decision time, HH:MM, for the comparison line"),
) -> dict:
    try:
        start_dt = service.parse_input_time(start)
        end_dt = service.parse_input_time(end, end_of_day=True)
        cutoff_time = parse_cutoff(cutoff)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid start, end or cutoff")
    try:
        return service.get_horizon_accuracy(start_dt, end_dt, cutoff_time)
    except ElexonError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# In Docker, the built React app is served by this same server.
# STATIC_DIR is set in the Dockerfile. On Vercel it is not set, because Vercel serves the files.
_static_dir = os.environ.get("STATIC_DIR")
if _static_dir and os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
