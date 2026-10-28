export const fmtMW = (v) =>
  v == null ? "-" : Math.round(v).toLocaleString("en-GB");

export const fmtSigned = (v) =>
  v == null ? "-" : `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("en-GB")}`;

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
export const fmtDateTime = (ms) => `${dayFmt.format(ms)} ${timeFmt.format(ms)} UTC`;
