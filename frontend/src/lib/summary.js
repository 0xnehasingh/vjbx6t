import { fmtMW } from "./format.js";

// Describes the rule that was used, in plain words.
export function ruleText({ mode, horizon, cutoff }) {
  return mode === "dayahead"
    ? `the latest forecast published by ${cutoff} UTC on the day before`
    : `the latest forecast published at least ${horizon} h earlier`;
}

// One or two plain-English sentences about the result, for a buyer.
export function buildSummary(metrics, params) {
  if (!metrics || metrics.count === 0) return null;
  const { difference, meanActual, mae, p90AbsError } = metrics;
  const share = meanActual ? Math.abs(difference) / meanActual : 0;
  let bias;
  if (share < 0.01) bias = "was almost exactly right on average";
  else if (difference > 0) bias = `ran high by ${fmtMW(difference)} MW on average (${Math.round(share * 100)}% of actual output)`;
  else bias = `ran low by ${fmtMW(-difference)} MW on average (${Math.round(share * 100)}% of actual output)`;
  const pointer =
    share < 0.01
      ? ""
      : difference > 0
        ? " A forecast that is too high means less wind arrived than planned, so you may need to buy extra power."
        : " A forecast that is too low means more wind arrived than planned, so you may have bought more than you needed.";
  return {
    headline: `Using ${ruleText(params)}, the forecast ${bias}.`,
    detail: `A typical miss was ${fmtMW(mae)} MW. On 9 of 10 half-hours the miss was under ${fmtMW(p90AbsError)} MW, so a buffer of about ${fmtMW(p90AbsError)} MW would have covered most of them.${pointer}`,
  };
}
