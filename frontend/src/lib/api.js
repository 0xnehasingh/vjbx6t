import { generateMock } from "./mock.js";

// Loads data from the backend (/api/timeseries).
// If the API fails, we fall back to sample data and add a warning message.
// Returns { points, metrics, isSample, warning }.
export async function loadTimeseries({ start, end, horizon }) {
  const query = new URLSearchParams({ start, end, horizon: String(horizon) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`/api/timeseries?${query}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`The server answered with status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.points) || !data.metrics) throw new Error("Unexpected answer from the server");
    return { points: data.points, metrics: data.metrics, isSample: false, warning: null };
  } catch (err) {
    const reason = err.name === "AbortError" ? "The request took too long" : err.message;
    return {
      ...generateMock({ start, end, horizon }),
      isSample: true,
      warning: `Could not load live data (${reason}). Showing sample data instead.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
