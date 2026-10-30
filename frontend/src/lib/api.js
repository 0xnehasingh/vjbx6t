import { toApiTime } from "./format.js";
import { generateMock, generateMockHorizonAccuracy } from "./mock.js";

// Loads data from the backend (/api/timeseries).
// If the API fails, we fall back to sample data and add a warning message.
// Returns { points, metrics, isSample, warning }.
export async function loadTimeseries({ start, end, mode, horizon, cutoff }, signal) {
  const query = new URLSearchParams({ start: toApiTime(start), end: toApiTime(end), mode });
  if (mode === "dayahead") query.set("cutoff", cutoff);
  else query.set("horizon", String(horizon));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`/api/timeseries?${query}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`The server answered with status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.points) || !data.metrics) throw new Error("Unexpected answer from the server");
    return { points: data.points, metrics: data.metrics, isSample: false, warning: null };
  } catch (err) {
    if (signal?.aborted) throw err; // a newer request replaced this one
    const reason = err.name === "AbortError" ? "The request took too long" : err.message;
    return {
      ...generateMock({ start, end, mode, horizon, cutoff }),
      isSample: true,
      warning: `Could not load live data (${reason}). Showing sample data instead.`,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// Error for every horizon 0-48 h (one request). Falls back to sample data like the main call.
export async function loadHorizonAccuracy({ start, end, cutoff }, signal) {
  const query = new URLSearchParams({ start: toApiTime(start), end: toApiTime(end), cutoff });
  try {
    const res = await fetch(`/api/horizon-accuracy?${query}`, { signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.rows)) throw new Error("Unexpected answer from the server");
    return { rows: data.rows, dayAhead: data.dayAhead, isSample: false };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { ...generateMockHorizonAccuracy({ start, end, cutoff }), isSample: true };
  }
}
