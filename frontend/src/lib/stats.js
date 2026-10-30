// Small helpers that turn the API points into numbers for the extra charts.
// "Error" always means forecast minus actual (MW).

const errorOf = (p) => (p.actual != null && p.forecast != null ? p.forecast - p.actual : null);

export function withError(points) {
  return points.map((p) => ({ ...p, t: Date.parse(p.startTime), error: errorOf(p) }));
}

export function percentile(sorted, q) {
  if (!sorted.length) return null;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Histogram of errors in buckets of `width` MW, centred so that 0 sits in the middle of a bucket.
export function errorHistogram(points, width = 500) {
  const errs = points.map(errorOf).filter((e) => e != null);
  if (!errs.length) return null;
  const sorted = [...errs].sort((a, b) => a - b);
  const idx = (e) => Math.round(e / width);
  const lo = idx(sorted[0]);
  const hi = idx(sorted[sorted.length - 1]);
  const bins = [];
  for (let i = lo; i <= hi; i++) bins.push({ center: i * width, count: 0, label: `${i * width}` });
  for (const e of errs) bins[idx(e) - lo].count += 1;
  return {
    bins,
    width,
    p10: percentile(sorted, 0.1),
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    total: errs.length,
  };
}

// Average absolute error for each hour of the day (UTC).
export function errorByHourOfDay(points) {
  const sums = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
  for (const p of points) {
    const e = errorOf(p);
    if (e == null) continue;
    const h = new Date(p.startTime).getUTCHours();
    sums[h].sum += Math.abs(e);
    sums[h].n += 1;
  }
  return sums.map((s, hour) => ({ hour, mae: s.n ? s.sum / s.n : null, n: s.n }));
}

// The biggest misses (by absolute error).
export function worstMisses(points, count = 10) {
  // Both half-hours of an hour share one forecast, so keep the worse of the two.
  const byHour = new Map();
  for (const p of points) {
    const e = errorOf(p);
    if (e == null) continue;
    const key = Math.floor(Date.parse(p.startTime) / 3600000);
    const cur = byHour.get(key);
    if (!cur || Math.abs(e) > Math.abs(cur.error)) byHour.set(key, { ...p, error: e });
  }
  return [...byHour.values()]
    .sort((a, b) => Math.abs(b.error) - Math.abs(a.error))
    .slice(0, count);
}
