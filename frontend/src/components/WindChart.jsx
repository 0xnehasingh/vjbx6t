import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDateTime, fmtDay, fmtMW } from "../lib/format.js";

const ACTUAL = "#2dd4bf";
const FORECAST = "#f59e0b";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{fmtDateTime(label)}</div>
      <div style={{ color: ACTUAL }}>Actual: {fmtMW(p.actual)} MW</div>
      <div style={{ color: FORECAST }}>Forecast: {fmtMW(p.forecast)} MW</div>
      {p.publishTime && (
        <div className="chart-tip-note">
          Published {fmtDateTime(Date.parse(p.publishTime))}
        </div>
      )}
    </div>
  );
}

export default function WindChart({ points }) {
  const data = points.map((p) => ({ ...p, t: Date.parse(p.startTime) }));
  const span = data.length ? data[data.length - 1].t - data[0].t : 0;
  const days = span / 86400000;
  const ticks = [];
  if (data.length) {
    // Ticks at round times: every 6 h for short ranges, otherwise at midnight every N days
    const step = days <= 2 ? 6 * 3600000 : Math.ceil(days / 7) * 86400000;
    for (let t = Math.ceil(data[0].t / step) * step; t <= data[data.length - 1].t; t += step) ticks.push(t);
  }
  const tickFmt = (ms) => (days <= 2 ? `${fmtDay(ms)} ${new Date(ms).toISOString().slice(11, 16)}` : fmtDay(ms));

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#243238" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={tickFmt}
            stroke="#8aa0a8"
            tick={{ fontSize: 12 }}
            minTickGap={40}
          />
          <YAxis
            stroke="#8aa0a8"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v / 1000}k`}
            width={44}
            label={{ value: "MW", angle: -90, position: "insideLeft", fill: "#8aa0a8", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend verticalAlign="top" height={32} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke={ACTUAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke={FORECAST} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
