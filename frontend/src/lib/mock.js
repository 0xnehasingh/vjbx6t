// Sample data generator, used when the backend is not available.
// It is deterministic (same input, same output) so the demo is stable.
import { computeMetrics } from "./metrics.js";

const HALF_HOUR = 30 * 60 * 1000;
const HOUR = 2 * HALF_HOUR;
const JAN_START = Date.UTC(2026, 0, 1);

// Small seeded random number generator (mulberry32)
function rand(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Roughly normal random number from a seed
function gauss(seed) {
  const u = Math.max(rand(seed * 2 + 1), 1e-9);
  const v = rand(seed * 2 + 2);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// "True" wind output in MW at a time: slow weather waves plus small noise
function actualAt(ms) {
  const h = (ms - JAN_START) / HOUR;
  const slow =
    7000 * Math.sin(h / 23 + 1) + 3500 * Math.sin(h / 9 + 2) + 1800 * Math.sin(h / 3.7);
  const noise = gauss(Math.round((ms - JAN_START) / HALF_HOUR)) * 350;
  return Math.min(21000, Math.max(700, 10500 + slow + noise));
}

// Forecast error grows with the horizon (further ahead = less accurate)
function forecastAt(hourMs, horizon) {
  const base = actualAt(hourMs);
  const seed = Math.round((hourMs - JAN_START) / HOUR) * 97 + Math.round(horizon);
  const sigma = 250 + 330 * Math.sqrt(horizon);
  const bias = -60; // slight under-forecast
  return Math.min(21000, Math.max(500, base + bias + gauss(seed) * sigma));
}

export function generateMock({ start, end, horizon }) {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T23:30:00Z`);
  const points = [];
  for (let t = from; t <= to; t += HALF_HOUR) {
    const hourMs = Math.floor(t / HOUR) * HOUR;
    points.push({
      startTime: new Date(t).toISOString(),
      actual: Math.round(actualAt(t)),
      forecast: Math.round(forecastAt(hourMs, horizon)),
      publishTime: new Date(hourMs - horizon * HOUR).toISOString(),
      horizonHours: horizon,
    });
  }
  return { points, metrics: computeMetrics(points) };
}
