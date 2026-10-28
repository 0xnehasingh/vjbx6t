// Metrics for the sample (mock) data. The backend uses the same formulas.
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function computeMetrics(points) {
  const pairs = points.filter((p) => p.actual != null && p.forecast != null);
  const coverage = points.length ? pairs.length / points.length : 0;
  if (!pairs.length) {
    return {
      meanActual: null,
      meanForecast: null,
      difference: null,
      mae: null,
      rmse: null,
      p90AbsError: null,
      coverage,
      count: 0,
    };
  }
  const actual = pairs.map((p) => p.actual);
  const forecast = pairs.map((p) => p.forecast);
  const errors = pairs.map((p) => p.forecast - p.actual);
  const abs = errors.map(Math.abs).sort((a, b) => a - b);
  // P90 with linear interpolation between neighbours
  const pos = 0.9 * (abs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const p90 = abs[lo] + (abs[hi] - abs[lo]) * (pos - lo);
  return {
    meanActual: mean(actual),
    meanForecast: mean(forecast),
    difference: mean(forecast) - mean(actual),
    mae: mean(abs),
    rmse: Math.sqrt(mean(errors.map((e) => e * e))),
    p90AbsError: p90,
    coverage,
    count: pairs.length,
  };
}
