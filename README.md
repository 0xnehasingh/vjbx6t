# WindFlow

<img src="frontend/public/windflow-logo.png" alt="WindFlow logo" width="96" />

_UK wind forecast vs actual, January 2026._

A web app that compares **UK national wind power forecasts** with **actual generation** for January 2026. It helps a power buyer see how good the forecasts are, and which forecast was available when a day-ahead decision had to be made.

**Live app:** https://vjbx6t.vercel.app

## What problem does it solve?

A UK utility buys power the day before. To do this, it needs:

1. **The latest wind forecast that was available at decision time** (not one published later).
2. **A clear number for forecast accuracy**, so it knows how much to trust the forecast.

## Features

- **Actual vs forecast chart** (MW) with legend, a tooltip (actual, forecast, error, forecast publish time and age) and optional **gap shading**: amber where the forecast was too high, blue where it was too low. Where no forecast was old enough, the forecast line is left blank.
- **Two ways to choose the forecast** (toggle at the top):
  - **Horizon**: a slider from 0 to 48 hours (default 4). Uses the latest forecast published at least that long before each time.
  - **Day-ahead**: pick a decision time on the day before (default 09:00 UTC, with quick choices 08:00 to 12:00 and a time box). For every time on day D, uses the latest forecast published at or before that time on day D-1.
- **Date and time range** (From / To), clamped to 1 Jan 00:00 to 31 Jan 23:30 2026 and labelled UTC, plus quick ranges: Week 1 to Week 4, Full month and Single day.
- **Plain-English summary** of the result, for example "the forecast ran high by 1,365 MW on average ... a buffer of about 4,164 MW would have covered 9 in 10 half-hours".
- **Metric cards** with units, a one-line caption and a tooltip in plain words: average actual, average forecast, difference, MAE (with the miss as a share of typical output), RMSE, P90 error (suggested buffer) and coverage.
- **More views of the same data**: error by forecast horizon (0 to 48 h, with the day-ahead result as a reference line), a histogram of the errors with P10, median and P90 markers, error by hour of day, and a table of the ten biggest misses.
- **Clear empty state**: at a horizon of 48 h almost no forecast is old enough, so the app says so, shows only the actuals and offers a shorter horizon.
- Dark theme, responsive layout for phone, tablet and desktop, loading skeletons, the previous result stays on screen while new data loads, and slider changes are debounced.
- If the API is down, the app shows **sample data** with a visible "Sample data" badge.

## Data

All data comes from the free [Elexon BMRS API](https://bmrs.elexon.co.uk/api-documentation). No API key is needed.

| Data | Dataset | Details |
| --- | --- | --- |
| Actual wind generation | `FUELHH` (fuel type `WIND`) | Every 30 minutes, in MW |
| Wind forecast | `WINDFOR` | One value per hour. Each forecast has a `publishTime`. A new forecast is published every few hours. |

All times are in UTC.

## How the forecast is chosen

### Horizon mode

For every time **T** on the chart, the app picks one forecast:

- The forecast must have been **published at least `horizon` hours before T** (`publishTime <= T - horizon`). This way, nothing from the future is used.
- Forecasts published **more than 48 hours before T** are ignored.
- From the forecasts that are left, the app takes the **latest published** one.

Example with a 4 hour horizon: for T = 12:00, a forecast published at 07:30 can be used, but one published at 09:00 cannot.

### Day-ahead mode

A buyer who commits to power the day before has to decide at a fixed time. For every time **T** on day **D**:

- The forecast must have been **published at or before the decision time on day D-1** (default 09:00).
- Forecasts published **more than 48 hours before T** are still ignored.
- From the forecasts that are left, the app takes the **latest published** one.

The decision time is in UTC. In January the UK is on GMT, so it is the same as UK local time. Every time on the same day uses the same decision time, so later times on day D are forecast further ahead (for example, a 09:00 decision is about 15 h ahead of 00:00 on day D and about 38 h ahead of 23:00).

Notes:

- Actuals are every 30 minutes and forecasts are every hour, so both half-hours of an hour share the same forecast.
- With a very long horizon (about 44 hours or more) fewer forecasts qualify, so some times have no forecast. The footer shows the share of times that have a forecast (coverage). At exactly 48 hours there is almost no forecast left, so the app shows an explanation instead of an empty chart.

## The metrics, in simple words

Only times that have both an actual value and a forecast are used. "Error" means forecast minus actual.

| Metric | Meaning |
| --- | --- |
| Average forecast / actual | The mean of the forecast or actual values in the period. |
| Difference | Average forecast minus average actual. Negative means the forecast was too low. The card is **green** when the difference is under 5% of the average actual, and **red** when it is bigger. |
| MAE (mean absolute error) | The average size of the miss, ignoring direction. Lower is better. |
| RMSE (root mean square error) | Like MAE, but big misses count more. Lower is better. |
| P90 error | 9 out of 10 forecasts missed by less than this number. It shows the "bad day" size of the error. |
| Coverage | The share of times that have a forecast. |

## Architecture

```
Browser (React + Vite + Recharts)
        |
        |  GET /api/timeseries?start=&end=&mode=&horizon=&cutoff=
        v
FastAPI backend (Python)
   |-- elexon.py     calls Elexon (FUELHH, WINDFOR) and caches the answers in memory
   |-- selection.py  picks the latest forecast for each time
   |-- metrics.py    MAE, RMSE, P90 and more
   '-- service.py    joins actuals and forecasts and builds the answer
```

- **On Vercel:** the React app is built to static files, and the API runs as a Python serverless function (`api/index.py`). `vercel.json` sends `/api/*` to it.
- **In Docker:** one container runs FastAPI, which serves both the API and the built React files.

### API

- `GET /api/health` returns `{"status": "ok"}`.
- `GET /api/timeseries` returns the chart data and metrics.

  | Parameter | Meaning |
  | --- | --- |
  | `start`, `end` | A date (`2026-01-05`) or a UTC date and time (`2026-01-05T09:30:00Z`). A date-only `end` means the end of that day. Default `2026-01-01` to `2026-01-07`. |
  | `mode` | `horizon` (default) or `dayahead`. |
  | `horizon` | Hours, 0 to 48, default 4. Used when `mode=horizon`. |
  | `cutoff` | Decision time on the day before, `HH:MM` in UTC, default `09:00`. Used when `mode=dayahead`. |

  Example: `/api/timeseries?start=2026-01-01&end=2026-01-07&mode=dayahead&cutoff=09:00`

  The answer has `start`, `end`, `mode`, `horizon`, `cutoff`, then:
  - `points`: a list of `{startTime, actual, forecast, publishTime, horizonHours, decisionTime}` (`decisionTime` is set in day-ahead mode only)
  - `metrics`: `meanActual, meanForecast, difference, mae, rmse, p90AbsError, coverage, count`
- `GET /api/horizon-accuracy?start=&end=&cutoff=09:00` returns the error for every whole horizon from 0 to 48 h (`rows`: `horizon, mae, rmse, coverage, count`) and the same numbers for the day-ahead rule (`dayAhead`).

Dates outside January 2026 are cut to January 2026. `horizon` must be between 0 and 48, and `cutoff` must look like `09:00`. Bad values get a 422 answer.

## Files and folders

```
.
├── frontend/                  # React app (Vite)
│   ├── index.html             # Main HTML page
│   ├── package.json           # Packages and scripts
│   ├── vite.config.js         # Vite settings, and the /api proxy for local work
│   └── src/
│       ├── main.jsx           # App entry point
│       ├── App.jsx            # Page layout and data loading
│       ├── index.css          # Styles (dark theme)
│       ├── components/
│       │   ├── WindChart.jsx  # Actual vs forecast chart with gap shading
│       │   ├── AccuracyCharts.jsx # Error by horizon, histogram, error by hour
│       │   ├── WorstMisses.jsx    # Table of the ten biggest misses
│       │   ├── MetricCard.jsx # One metric card with a tooltip
│       │   ├── Panel.jsx, HowToRead.jsx
│       │   └── Controls.jsx   # Mode toggle, horizon slider, day-ahead time, date range and presets
│       └── lib/
│           ├── api.js         # Calls /api/timeseries, falls back to sample data
│           ├── mock.js        # Sample data generator
│           ├── metrics.js     # Metrics for the sample data
│           ├── stats.js       # Histogram, hour-of-day and worst-miss helpers
│           ├── summary.js     # Plain-English summary text
│           ├── format.js      # Number and date formatting
│           └── constants.js   # January 2026 limits and defaults
├── backend/                   # Python backend (FastAPI)
│   ├── app/
│   │   ├── main.py            # FastAPI app and endpoints
│   │   ├── elexon.py          # Elexon API client (httpx) with cache
│   │   ├── selection.py       # Latest-forecast selection (horizon and day-ahead)
│   │   ├── metrics.py         # Accuracy metrics
│   │   ├── service.py         # Builds the time series answer
│   │   └── models.py          # Small data classes
│   ├── tests/                 # pytest tests
│   ├── requirements.txt       # Python packages
│   └── requirements-dev.txt   # Packages for tests
├── api/index.py               # Vercel entry point for the Python backend
├── requirements.txt           # Same as backend/requirements.txt (Vercel reads this one)
├── vercel.json                # Vercel build settings and /api rewrite
├── Dockerfile                 # Builds the frontend, then runs the API + static files
├── docker-compose.yml         # Runs the Docker image with one command
└── README.md                  # This file
```

## Run locally

You need [Node.js](https://nodejs.org/) 20+ and Python 3.11+.

### Without Docker

Open two terminals.

**Terminal 1: backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2: frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server sends `/api` calls to http://localhost:8000.

### With Docker

```bash
docker compose up --build
```

Open http://localhost:8000. Or without compose:

```bash
docker build -t windflow .
docker run -p 8000:8000 windflow
```

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The tests cover the forecast selection logic (horizon mode, day-ahead mode, the 48 hour limit, picking the latest one), the metrics (MAE, RMSE, P90, coverage) and the API parameters.

## Deploy

The app is deployed on Vercel. The Vercel project is connected to this GitHub repo, so every push to `main` deploys automatically.

## AI tools used

I used Claude and Cursor as AI assistants for:

- **Coding assistance:** scaffolding, writing and debugging parts of the frontend and backend.
- **Design and logo:** UI layout ideas and the WindFlow logo.
- **Research:** understanding the Elexon FUELHH and WINDFOR datasets and forecast-accuracy metrics.

I reviewed the code, checked the results against Elexon's live data, and made the final design decisions myself.
