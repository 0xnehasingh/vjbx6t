import { useEffect, useMemo, useState } from "react";
import { HorizonChart, ErrorHistogram, HourOfDayChart } from "./components/AccuracyCharts.jsx";
import Controls from "./components/Controls.jsx";
import HowToRead from "./components/HowToRead.jsx";
import MetricCard from "./components/MetricCard.jsx";
import Panel from "./components/Panel.jsx";
import WindChart, { FORECAST, UNDER } from "./components/WindChart.jsx";
import WorstMisses from "./components/WorstMisses.jsx";
import {
  DEBOUNCE_MS,
  DEFAULT_CUTOFF,
  DEFAULT_END,
  DEFAULT_HORIZON,
  DEFAULT_MODE,
  DEFAULT_START,
  DIFF_THRESHOLD,
} from "./lib/constants.js";
import { fmtMW, fmtPct, fmtSigned } from "./lib/format.js";
import { loadHorizonAccuracy, loadTimeseries } from "./lib/api.js";
import { errorByHourOfDay, errorHistogram, worstMisses } from "./lib/stats.js";
import { buildSummary } from "./lib/summary.js";
import useDebounced from "./lib/useDebounced.js";

export default function App() {
  const [params, setParams] = useState({
    start: DEFAULT_START,
    end: DEFAULT_END,
    mode: DEFAULT_MODE,
    horizon: DEFAULT_HORIZON,
    cutoff: DEFAULT_CUTOFF,
  });
  const [showBand, setShowBand] = useState(true);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [acc, setAcc] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Wait for the user to stop moving the slider before asking the API.
  const query = useDebounced(params, DEBOUNCE_MS);
  const pending = query !== params;

  useEffect(() => {
    const controller = new AbortController();
    // Keep the previous data on screen while the new data loads.
    setState((s) => ({ ...s, loading: true, error: null }));
    loadTimeseries(query, controller.signal)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: err.message || "Something went wrong" }));
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  // The error-by-horizon chart only depends on the range and the day-ahead time.
  useEffect(() => {
    const controller = new AbortController();
    loadHorizonAccuracy({ start: query.start, end: query.end, cutoff: query.cutoff }, controller.signal)
      .then(setAcc)
      .catch(() => {});
    return () => controller.abort();
  }, [query.start, query.end, query.cutoff, reloadKey]);

  const { loading, error, data } = state;
  const busy = loading || pending;
  const m = data?.metrics;
  const hasForecast = m && m.count > 0;
  const firstLoad = !data;
  const points = data?.points;

  const summary = useMemo(() => buildSummary(m, params.mode === query.mode ? query : params), [m, query, params]);
  const hist = useMemo(() => (hasForecast ? errorHistogram(points) : null), [points, hasForecast]);
  const byHour = useMemo(() => (hasForecast ? errorByHourOfDay(points) : null), [points, hasForecast]);
  const worst = useMemo(() => (hasForecast ? worstMisses(points, 10) : []), [points, hasForecast]);
  const ages = useMemo(() => {
    const a = (points || []).map((p) => p.horizonHours).filter((h) => h != null);
    return a.length ? { min: Math.min(...a), max: Math.max(...a) } : null;
  }, [points]);

  const update = (patch) => setParams((p) => ({ ...p, ...patch }));
  const diffSmall = hasForecast && m.meanActual != null && Math.abs(m.difference) < DIFF_THRESHOLD * m.meanActual;
  const missPct = hasForecast && m.meanActual ? Math.round((m.mae / m.meanActual) * 100) : null;
  const diffCaption = !hasForecast
    ? ""
    : Math.abs(m.difference) < 0.01 * m.meanActual
      ? "Almost exactly right"
      : m.difference > 0
        ? "Forecast too high on average"
        : "Forecast too low on average";
  const rule = query.mode === "dayahead" ? `Day-ahead, ${query.cutoff} UTC` : `Horizon ${query.horizon} h`;
  const lowCoverage = hasForecast && m.coverage < 0.5;

  return (
    <div className="app">
      <header className="header">
        <img className="logo" src="/windflow-logo.png" alt="WindFlow logo" width="40" height="40" />
        <div className="header-text">
          <h1>WindFlow</h1>
          <p className="subtitle">
            UK wind forecast vs actual for January 2026: how good was the forecast you could see when you had to buy power?
          </p>
        </div>
        <div className="header-badges">
          <span className="chip-static" title="All times on this page are UTC (same as UK time in January)">All times UTC</span>
          {data?.isSample ? (
            <span className="sample-badge">Sample data</span>
          ) : (
            data && <span className="live-badge">Live data</span>
          )}
        </div>
      </header>

      <Controls {...params} onChange={update} />

      {(error || data?.warning) && (
        <div className="alert" role="alert">
          <span>{error || data.warning}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      <section className={`summary ${firstLoad ? "summary-skeleton" : ""}`} aria-label="Summary" aria-live="polite">
        {firstLoad ? (
          <>
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line skeleton-short" />
          </>
        ) : summary ? (
          <div className={busy ? "stale" : ""}>
            <p className="summary-head">{summary.headline}</p>
            <p className="summary-detail">{summary.detail}</p>
          </div>
        ) : (
          <div className={busy ? "stale" : ""}>
            <p className="summary-head">No forecast to judge for these settings.</p>
            <p className="summary-detail">Try a shorter horizon, a later decision time or a different range.</p>
          </div>
        )}
      </section>

      <section className="cards" aria-label="Accuracy metrics">
        <MetricCard
          label="Average actual"
          value={fmtMW(m?.meanActual)}
          caption="What wind really generated"
          hint="The average real wind output (from Elexon FUELHH) over the times that have a forecast."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="Average forecast"
          value={fmtMW(m?.meanForecast)}
          caption={params.mode === "dayahead" ? `Known by ${params.cutoff} the day before` : `Known ${params.horizon} h ahead`}
          hint="The average of the forecasts you could have used under the chosen rule."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="Difference"
          value={fmtSigned(m?.difference)}
          caption={diffCaption}
          tone={hasForecast ? (diffSmall ? "good" : "bad") : undefined}
          hint="Average forecast minus average actual. Positive: the forecast promised more wind than arrived, so you may be short. Negative: more wind arrived than promised. Green when under 5% of the average actual."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="MAE"
          value={fmtMW(m?.mae)}
          caption={missPct != null ? `${missPct}% of typical output` : ""}
          hint="Mean absolute error: how far off the forecast was on a typical half-hour, up or down. Lower is better. Think of it as the usual size of the gap you had to cover."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="RMSE"
          value={fmtMW(m?.rmse)}
          caption="Big misses count more"
          hint="Root mean square error: like MAE, but large misses weigh more. If it is much higher than MAE, a few big misses are hiding behind a good average."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="P90 error"
          value={fmtMW(m?.p90AbsError)}
          caption="Suggested buffer"
          hint="On 9 out of 10 half-hours the miss was smaller than this. A sensible size for a safety buffer when you plan for a bad day."
          loading={firstLoad}
          stale={busy}
        />
        <MetricCard
          label="Coverage"
          value={fmtPct(m?.coverage)}
          unit=""
          caption={m ? `${m.count.toLocaleString("en-GB")} of ${points.length.toLocaleString("en-GB")} half-hours` : ""}
          hint="The share of half-hours in your range that had a forecast old enough to use. Less than 100% means some times had no forecast under this rule."
          loading={firstLoad}
          stale={busy}
        />
      </section>

      <Panel
        title="Actual vs forecast wind generation"
        subtitle={
          ages
            ? `${rule}. Forecasts used were published ${ages.min.toFixed(0)}-${ages.max.toFixed(0)} h before the time they predict.`
            : rule
        }
        busy={busy && !firstLoad}
      >
        <div className="legend" aria-label="Chart legend">
          <span className="legend-item"><i className="swatch swatch-line" style={{ background: "#2dd4bf" }} />Actual</span>
          <span className="legend-item"><i className="swatch swatch-line" style={{ background: FORECAST }} />Forecast</span>
          {showBand && (
            <>
              <span className="legend-item"><i className="swatch" style={{ background: FORECAST, opacity: 0.45 }} />Forecast too high</span>
              <span className="legend-item"><i className="swatch" style={{ background: UNDER, opacity: 0.45 }} />Forecast too low</span>
            </>
          )}
          <label className="toggle">
            <input type="checkbox" checked={showBand} onChange={(e) => setShowBand(e.target.checked)} />
            Show gap shading
          </label>
          {busy && !firstLoad && <span className="loading-text" role="status">Updating…</span>}
        </div>

        {data && !hasForecast && (
          <div className="notice" role="status">
            <div>
              <strong>No forecast is old enough for this setting.</strong>
              <p>
                {params.mode === "horizon" && params.horizon >= 47
                  ? `Elexon publishes wind forecasts up to 48 hours ahead, and almost none are published that early. At a ${params.horizon} h horizon there is nothing to compare, so only the actual line is shown. Try a shorter horizon.`
                  : "No forecast met the rule for the times in this range, so only the actual line is shown. Try a shorter horizon, a later decision time or a different range."}
              </p>
            </div>
            {params.mode === "horizon" && params.horizon >= 47 && (
              <button type="button" onClick={() => update({ horizon: 24 })}>Use 24 h</button>
            )}
          </div>
        )}
        {lowCoverage && (
          <div className="notice notice-soft" role="status">
            <p>
              Only {fmtPct(m.coverage)} of the times in this range have a forecast this old. The numbers above
              use just those times, and gaps in the forecast line are left blank.
            </p>
          </div>
        )}

        {firstLoad ? (
          <div className="chart-box chart-skeleton" aria-label="Loading chart" />
        ) : points.length > 0 ? (
          <div className={busy ? "stale" : ""}>
            <WindChart points={points} mode={query.mode} showBand={showBand} />
          </div>
        ) : (
          <p className="empty">No data for this period.</p>
        )}
      </Panel>

      {hasForecast && (
        <div className="grid-2">
          <Panel
            title="Error by forecast horizon"
            subtitle={`Average miss (MAE) if you had used forecasts at least this old. Hover for details.${acc?.isSample ? " Sample data." : ""}`}
            busy={busy}
          >
            {acc ? (
              <HorizonChart rows={acc.rows} dayAhead={acc.dayAhead} mode={query.mode} horizon={query.horizon} cutoff={query.cutoff} />
            ) : (
              <div className="chart-box chart-small chart-skeleton" aria-label="Loading chart" />
            )}
          </Panel>
          <Panel
            title="How big were the misses?"
            subtitle="Number of half-hours in each error size. Dashed lines mark P10, median and P90."
            busy={busy}
          >
            {hist && <ErrorHistogram hist={hist} />}
          </Panel>
          <Panel title="Error by time of day" subtitle="Average miss (MAE) for each hour, UTC." busy={busy}>
            {byHour && <HourOfDayChart rows={byHour} />}
          </Panel>
          <Panel title="Ten biggest misses" subtitle="Largest gaps between forecast and actual in this range." busy={busy}>
            <WorstMisses rows={worst} />
          </Panel>
        </div>
      )}

      <HowToRead />

      <footer className="footer">
        <strong>WindFlow</strong>. All times are UTC (the same as UK time in January). Data covers January 2026.
        {data && !data.isSample && " Source: Elexon BMRS (FUELHH actuals, WINDFOR forecasts)."}
        {data?.isSample && " The numbers shown are generated sample data, not real measurements."}
      </footer>
    </div>
  );
}
