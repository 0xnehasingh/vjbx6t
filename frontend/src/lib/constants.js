// The app only covers January 2026 (all times are UTC; the UK is on GMT = UTC in January).
export const MIN_DATE = "2026-01-01";
export const MAX_DATE = "2026-01-31";
// Date and time limits for datetime-local inputs. Actuals are half-hourly.
export const MIN_DT = "2026-01-01T00:00";
export const MAX_DT = "2026-01-31T23:30";
export const MAX_HORIZON = 48;
export const DEFAULT_HORIZON = 4;
export const DEFAULT_START = "2026-01-01T00:00";
export const DEFAULT_END = "2026-01-07T23:30";
export const DEFAULT_MODE = "horizon";
export const DEFAULT_CUTOFF = "09:00";
export const CUTOFF_CHOICES = ["08:00", "09:00", "10:00", "11:00", "12:00"];
// Green when the average difference is under this share of the average actual.
export const DIFF_THRESHOLD = 0.05;
// Wait this long after the last change before asking the API (keeps the slider smooth).
export const DEBOUNCE_MS = 300;

// Quick ranges. "day" means the whole day that the From field is on.
export const PRESETS = [
  { id: "week1", label: "Week 1", hint: "1-7 Jan", start: "2026-01-01T00:00", end: "2026-01-07T23:30" },
  { id: "week2", label: "Week 2", hint: "8-14 Jan", start: "2026-01-08T00:00", end: "2026-01-14T23:30" },
  { id: "week3", label: "Week 3", hint: "15-21 Jan", start: "2026-01-15T00:00", end: "2026-01-21T23:30" },
  { id: "week4", label: "Week 4", hint: "22-28 Jan", start: "2026-01-22T00:00", end: "2026-01-28T23:30" },
  { id: "month", label: "Full month", hint: "1-31 Jan", start: MIN_DT, end: MAX_DT },
];
