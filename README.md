# Wind Generation Forecast Monitor

A web app that compares **UK national wind power forecasts** with **actual generation** for January 2026. It helps a power buyer see how good the forecasts are, and which forecast was available when a day-ahead decision had to be made.

**Live app:** https://vjbx6t.vercel.app

## What problem does it solve?

A UK utility buys power the day before. To do this, it needs:

1. **The latest wind forecast that was available at decision time** (not one published later).
2. **A clear number for forecast accuracy**, so it knows how much to trust the forecast.

## Features

- Line chart of **actual** and **forecast** wind generation (MW), with legend and tooltip.
- **Forecast horizon slider** from 0 to 48 hours (default 4 hours).
- **Date range picker**, limited to January 2026.
- Metric cards: average forecast, average actual, difference, MAE, RMSE and P90 error.
- Dark theme, works on phone, tablet and desktop.
- Loading and error states. If the API is down, the app shows **sample data** with a visible "Sample data" badge.

## Data

All data comes from the free [Elexon BMRS API](https://bmrs.elexon.co.uk/api-documentation). No API key is needed.

| Data | Dataset | Details |
| --- | --- | --- |
| Actual wind generation | `FUELHH` (fuel type `WIND`) | Every 30 minutes, in MW |
| Wind forecast | `WINDFOR` | One value per hour. Each forecast has a `publishTime`. A new forecast is published every few hours. |

All times are in UTC.

## How the forecast is chosen

For every time **T** on the chart, the app picks one forecast:

- The forecast must have been **published at least `horizon` hours before T** (`publishTime <= T - horizon`). This way, nothing from the future is used.
- Forecasts published **more than 48 hours before T** are ignored.
- From the forecasts that are left, the app takes the **latest published** one.

Example with a 4 hour horizon: for T = 12:00, a forecast published at 07:30 can be used, but one published at 09:00 cannot.

Notes:

- Actuals are every 30 minutes and forecasts are every hour, so both half-hours of an hour share the same forecast.
- With a very long horizon (about 44 hours or more) fewer forecasts qualify, so some times have no forecast. The footer shows the share of times that have a forecast (coverage). At exactly 48 hours there is almost no forecast left.

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
        |  GET /api/timeseries?start=&end=&horizon=
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
- `GET /api/timeseries?start=2026-01-01&end=2026-01-07&horizon=4` returns:
  - `points`: a list of `{startTime, actual, forecast, publishTime, horizonHours}`
  - `metrics`: `meanActual, meanForecast, difference, mae, rmse, p90AbsError, coverage, count`

Dates outside January 2026 are cut to January 2026. `horizon` must be between 0 and 48.

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
│       │   ├── WindChart.jsx  # Recharts line chart
│       │   ├── MetricCard.jsx # One metric card with a tooltip
│       │   └── Controls.jsx   # Date pickers and horizon slider
│       └── lib/
│           ├── api.js         # Calls /api/timeseries, falls back to sample data
│           ├── mock.js        # Sample data generator
│           ├── metrics.js     # Metrics for the sample data
│           ├── format.js      # Number and date formatting
│           └── constants.js   # January 2026 limits and defaults
├── backend/                   # Python backend (FastAPI)
│   ├── app/
│   │   ├── main.py            # FastAPI app and endpoints
│   │   ├── elexon.py          # Elexon API client (httpx) with cache
│   │   ├── selection.py       # Latest-forecast selection logic
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
docker build -t wind-monitor .
docker run -p 8000:8000 wind-monitor
```

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The tests cover the forecast selection logic (horizon, the 48 hour limit, picking the latest one) and the metrics (MAE, RMSE, P90, coverage).

## Deploy

The app is deployed on Vercel. The Vercel project is connected to this GitHub repo, so every push to `main` deploys automatically.

## AI tools used

AI coding assistants were used to help scaffold and write parts of the code. All code was reviewed by the author.

_Author note (edit me): add which tools you used, what for, and what you changed or checked yourself._
