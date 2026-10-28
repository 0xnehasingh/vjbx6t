import { useEffect, useState } from "react";
import Controls from "./components/Controls.jsx";
import MetricCard from "./components/MetricCard.jsx";
import WindChart from "./components/WindChart.jsx";
import {
  DEFAULT_END,
  DEFAULT_HORIZON,
  DEFAULT_START,
  DIFF_THRESHOLD,
} from "./lib/constants.js";
import { fmtMW, fmtSigned } from "./lib/format.js";
import { loadTimeseries } from "./lib/api.js";

export default function App() {
  const [params, setParams] = useState({
    start: DEFAULT_START,
    end: DEFAULT_END,
    horizon: DEFAULT_HORIZON,
  });
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadTimeseries(params)
      .then((data) => !cancelled && setState({ loading: false, error: null, data }))
      .catch((err) =>
        !cancelled && setState((s) => ({ ...s, loading: false, error: err.message || "Something went wrong" }))
      );
    return () => {
      cancelled = true;
    };
  }, [params, reloadKey]);

  const { loading, error, data } = state;
  const m = data?.metrics;
  const diffSmall =
    m && m.meanActual != null && Math.abs(m.difference) < DIFF_THRESHOLD * m.meanActual;
  const diffHint =
    "Forecast average minus actual average. Green when the difference is under 5% of the average actual; red when it is larger. A negative number means the forecast was too low.";

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Wind Generation Forecast Monitor</h1>
          <p className="subtitle">UK national wind generation: forecast vs actual</p>
        </div>
        {data?.isSample && <span className="sample-badge">Sample data</span>}
      </header>

      <Controls {...params} onChange={(patch) => setParams((p) => ({ ...p, ...patch }))} />

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      <section className="cards" aria-label="Metrics">
        <MetricCard label="Average forecast" value={fmtMW(m?.meanForecast)} loading={loading && !data} hint="Mean of the forecast values in the selected period." />
        <MetricCard label="Average actual" value={fmtMW(m?.meanActual)} loading={loading && !data} hint="Mean of the real wind generation in the selected period." />
        <MetricCard
          label="Difference"
          value={fmtSigned(m?.difference)}
          tone={m && m.meanActual != null ? (diffSmall ? "good" : "bad") : undefined}
          loading={loading && !data}
          hint={diffHint}
        />
        <MetricCard label="MAE" value={fmtMW(m?.mae)} loading={loading && !data} hint="Mean absolute error: the average size of the miss, ignoring direction. Lower is better." />
        <MetricCard label="RMSE" value={fmtMW(m?.rmse)} loading={loading && !data} hint="Root mean square error: like MAE, but big misses count more. Lower is better." />
        <MetricCard label="P90 error" value={fmtMW(m?.p90AbsError)} loading={loading && !data} hint="9 out of 10 forecasts missed by less than this amount." />
      </section>

      <section className={`panel ${loading ? "panel-loading" : ""}`}>
        <div className="panel-head">
          <h2>Wind generation (MW)</h2>
          {loading && <span className="loading-text">Loading…</span>}
        </div>
        {data && data.points.length > 0 ? (
          <WindChart points={data.points} />
        ) : (
          !loading && <p className="empty">No data for this period.</p>
        )}
      </section>

      <footer className="footer">
        All times are UTC. Data covers January 2026.
        {m && m.coverage != null && ` Forecast available for ${Math.round(m.coverage * 100)}% of points.`}
      </footer>
    </div>
  );
}
