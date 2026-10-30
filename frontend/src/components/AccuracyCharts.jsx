import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMW, fmtPct, fmtSigned } from "../lib/format.js";
import { ACTUAL, FORECAST, UNDER } from "./WindChart.jsx";

const AXIS = "#9fb3ba";
const GRID = "#243238";

function Tip({ active, payload, render }) {
  if (!active || !payload || !payload.length) return null;
  return <div className="chart-tip">{render(payload[0].payload)}</div>;
}

// Mean error for each horizon, 0-48 h
export function HorizonChart({ rows, dayAhead, mode, horizon, cutoff }) {
  const data = rows.map((r) => ({ ...r }));
  return (
    <div className="chart-box chart-small" role="img" aria-label="Line chart of mean absolute error against forecast horizon from 0 to 48 hours">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="horizon"
            type="number"
            domain={[0, 48]}
            ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48]}
            stroke={AXIS}
            tick={{ fontSize: 12 }}
            label={{ value: "Forecast horizon (hours)", position: "insideBottom", offset: -8, fill: AXIS, fontSize: 12 }}
          />
          <YAxis
            stroke={AXIS}
            tick={{ fontSize: 12 }}
            domain={[0, "auto"]}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
            width={44}
          />
          <Tooltip
            isAnimationActive={false}
            content={
              <Tip
                render={(p) => (
                  <>
                    <div className="chart-tip-title">Horizon {p.horizon} h</div>
                    <div className="tip-row"><span>MAE</span><b>{fmtMW(p.mae)} MW</b></div>
                    <div className="tip-row"><span>RMSE</span><b>{fmtMW(p.rmse)} MW</b></div>
                    <div className="chart-tip-note">Forecast available for {fmtPct(p.coverage)} of times</div>
                  </>
                )}
              />
            }
          />
          {dayAhead?.mae != null && (
            <ReferenceLine
              y={dayAhead.mae}
              stroke={UNDER}
              strokeDasharray="5 4"
              label={{ value: `Day-ahead ${cutoff}: ${fmtMW(dayAhead.mae)} MW`, position: "insideTopRight", fill: UNDER, fontSize: 12 }}
            />
          )}
          {mode === "horizon" && <ReferenceLine x={horizon} stroke={ACTUAL} strokeDasharray="3 3" />}
          <Line type="monotone" dataKey="mae" name="MAE" stroke={FORECAST} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// How big the misses were, in buckets
export function ErrorHistogram({ hist }) {
  const snap = (v) => {
    const k = Math.round(v / hist.width) * hist.width;
    return String(Math.min(Math.max(k, hist.bins[0].center), hist.bins[hist.bins.length - 1].center));
  };
  const markers = [
    ["P10", hist.p10, "top"],
    ["Median", hist.median, "insideTop"],
    ["P90", hist.p90, "top"],
  ];
  return (
    <div className="chart-box chart-small" role="img" aria-label="Bar chart showing how often the forecast error fell in each size bucket">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={hist.bins} margin={{ top: 22, right: 12, bottom: 16, left: 0 }} barCategoryGap={1}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke={AXIS}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(v) => (Number(v) / 1000).toFixed(1).replace(".0", "") + "k"}
            label={{ value: "Error = forecast - actual (MW)", position: "insideBottom", offset: -8, fill: AXIS, fontSize: 12 }}
          />
          <YAxis stroke={AXIS} tick={{ fontSize: 12 }} width={36} allowDecimals={false} />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            content={
              <Tip
                render={(b) => (
                  <>
                    <div className="chart-tip-title">
                      {fmtSigned(b.center - hist.width / 2)} to {fmtSigned(b.center + hist.width / 2)} MW
                    </div>
                    <div className="tip-row"><span>Half-hours</span><b>{b.count}</b></div>
                    <div className="chart-tip-note">{b.center > 0 ? "Forecast too high" : b.center < 0 ? "Forecast too low" : "Close to spot on"}</div>
                  </>
                )}
              />
            }
          />
          <Bar dataKey="count" isAnimationActive={false}>
            {hist.bins.map((b) => (
              <Cell key={b.center} fill={b.center > 0 ? FORECAST : b.center < 0 ? UNDER : ACTUAL} fillOpacity={0.85} />
            ))}
          </Bar>
          {markers.map(([name, v, position]) => (
            <ReferenceLine
              key={name}
              x={snap(v)}
              stroke="#e6f0f2"
              strokeDasharray="3 3"
              label={{ value: `${name} ${fmtSigned(v)}`, position, fill: "#e6f0f2", fontSize: 11 }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Average miss for each hour of the day (UTC)
export function HourOfDayChart({ rows }) {
  return (
    <div className="chart-box chart-small" role="img" aria-label="Bar chart of mean absolute error for each hour of the day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke={AXIS}
            tick={{ fontSize: 11 }}
            interval={2}
            tickFormatter={(h) => String(h).padStart(2, "0")}
            label={{ value: "Hour of day (UTC)", position: "insideBottom", offset: -8, fill: AXIS, fontSize: 12 }}
          />
          <YAxis stroke={AXIS} tick={{ fontSize: 12 }} width={44} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            content={
              <Tip
                render={(r) => (
                  <>
                    <div className="chart-tip-title">{String(r.hour).padStart(2, "0")}:00-{String(r.hour).padStart(2, "0")}:59 UTC</div>
                    <div className="tip-row"><span>MAE</span><b>{fmtMW(r.mae)} MW</b></div>
                  </>
                )}
              />
            }
          />
          <Bar dataKey="mae" fill={FORECAST} fillOpacity={0.85} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
