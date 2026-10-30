import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDateTime, fmtDay, fmtMW, fmtSigned } from "../lib/format.js";

export const ACTUAL = "#2dd4bf";
export const FORECAST = "#f59e0b";
export const UNDER = "#38bdf8";

function ChartTooltip({ active, payload, mode }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const err = p.actual != null && p.forecast != null ? p.forecast - p.actual : null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{fmtDateTime(p.t)}</div>
      <div className="tip-row"><span style={{ color: ACTUAL }}>Actual</span><b>{fmtMW(p.actual)} MW</b></div>
      <div className="tip-row"><span style={{ color: FORECAST }}>Forecast</span><b>{fmtMW(p.forecast)} MW</b></div>
      <div className="tip-row">
        <span>Error</span>
        <b>{err == null ? "-" : `${fmtSigned(err)} MW`}</b>
      </div>
      {p.publishTime ? (
        <div className="chart-tip-note">
          Forecast published {fmtDateTime(Date.parse(p.publishTime))}
          {p.horizonHours != null && ` (${Number(p.horizonHours).toFixed(1)} h ahead)`}
          {mode === "dayahead" && p.decisionTime && <><br />Decision time {fmtDateTime(Date.parse(p.decisionTime))}</>}
        </div>
      ) : (
        <div className="chart-tip-note">No forecast was old enough for this time.</div>
      )}
    </div>
  );
}

export default function WindChart({ points, mode, showBand }) {
  const data = points.map((p) => {
    const hasBoth = p.actual != null && p.forecast != null;
    const lo = hasBoth ? Math.min(p.actual, p.forecast) : null;
    return {
      ...p,
      t: Date.parse(p.startTime),
      lo,
      over: hasBoth ? Math.max(p.forecast - p.actual, 0) : null,
      under: hasBoth ? Math.max(p.actual - p.forecast, 0) : null,
    };
  });
  const first = data.length ? data[0].t : 0;
  const last = data.length ? data[data.length - 1].t : 0;
  const days = (last - first) / 86400000;
  const ticks = [];
  const step = days <= 1.5 ? 3 * 3600000 : days <= 3 ? 6 * 3600000 : Math.max(1, Math.ceil(days / 8)) * 86400000;
  for (let t = Math.ceil(first / step) * step; t <= last; t += step) ticks.push(t);
  const tickFmt = (ms) =>
    step < 86400000 ? `${fmtDay(ms)} ${new Date(ms).toISOString().slice(11, 16)}` : fmtDay(ms);
  const dayLines = [];
  if (days <= 8) for (let t = Math.ceil(first / 86400000) * 86400000; t <= last; t += 86400000) dayLines.push(t);

  return (
    <div className="chart-box" role="img" aria-label="Line chart of actual and forecast wind generation in megawatts over the selected period">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#243238" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={tickFmt}
            stroke="#9fb3ba"
            tick={{ fontSize: 12 }}
            minTickGap={36}
          />
          <YAxis
            stroke="#9fb3ba"
            tick={{ fontSize: 12 }}
            domain={[0, "auto"]}
            tickFormatter={(v) => `${v / 1000}k`}
            width={44}
            label={{ value: "MW", angle: -90, position: "insideLeft", fill: "#9fb3ba", fontSize: 12 }}
          />
          {true &&
            dayLines.map((t) => (
              <ReferenceLine key={t} x={t} stroke="#35484f" strokeDasharray="2 4" />
            ))}
          <Tooltip content={<ChartTooltip mode={mode} />} isAnimationActive={false} />
          {showBand && (
            <>
              <Area dataKey="lo" stackId="gap" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" activeDot={false} />
              <Area dataKey="over" stackId="gap" stroke="none" fill={FORECAST} fillOpacity={0.28} isAnimationActive={false} activeDot={false} />
              <Area dataKey="under" stackId="gap" stroke="none" fill={UNDER} fillOpacity={0.28} isAnimationActive={false} activeDot={false} />
            </>
          )}
          <Line type="linear" dataKey="actual" name="Actual" stroke={ACTUAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="forecast" name="Forecast" stroke={FORECAST} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
