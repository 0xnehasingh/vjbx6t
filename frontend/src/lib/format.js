export const fmtMW = (v) =>
  v == null ? "-" : Math.round(v).toLocaleString("en-GB");

export const fmtSigned = (v) =>
  v == null ? "-" : `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(Math.round(v)).toLocaleString("en-GB")}`;

export const fmtPct = (v) => (v == null ? "-" : `${Math.round(v * 100)}%`);

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export const fmtDay = (ms) => dayFmt.format(ms);
export const fmtTime = (ms) => timeFmt.format(ms);
export const fmtDateTime = (ms) => `${dayFmt.format(ms)} ${timeFmt.format(ms)} UTC`;

// "2026-01-05T09:30" (as typed in a datetime-local input) -> milliseconds, read as UTC
export const parseLocalUtc = (s) => Date.parse(`${s}:00Z`);
// milliseconds -> "2026-01-05T09:30"
export const toInputValue = (ms) => new Date(ms).toISOString().slice(0, 16);
// "2026-01-05T09:30" -> "2026-01-05T09:30:00Z" for the API
export const toApiTime = (s) => `${s}:00Z`;

// Keep a typed value inside January 2026 and on a half-hour boundary.
export function clampInput(value, min, max) {
  const ms = parseLocalUtc(value);
  if (Number.isNaN(ms)) return null;
  const half = 30 * 60 * 1000;
  const snapped = Math.floor(ms / half) * half;
  return toInputValue(Math.min(Math.max(snapped, parseLocalUtc(min)), parseLocalUtc(max)));
}
