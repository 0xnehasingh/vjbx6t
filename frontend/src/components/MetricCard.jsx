import { useId } from "react";

export default function MetricCard({ label, value, unit = "MW", caption, hint, tone, loading, stale }) {
  const tipId = useId();
  return (
    <div className={`card ${tone ? `card-${tone}` : ""} ${stale ? "card-stale" : ""}`}>
      <div className="card-label">
        <span>{label}</span>
        {hint && (
          <span className="info-wrap">
            <button type="button" className="info" aria-label={`What is ${label}?`} aria-describedby={tipId}>
              i
            </button>
            <span className="tip" role="tooltip" id={tipId}>
              {hint}
            </span>
          </span>
        )}
      </div>
      <div className="card-value" aria-busy={loading || undefined}>
        {loading ? (
          <span className="skeleton" aria-label="Loading" />
        ) : (
          <>
            {value}
            {value !== "-" && unit && <span className="unit"> {unit}</span>}
          </>
        )}
      </div>
      <div className="card-caption">{loading ? <span className="skeleton skeleton-sm" /> : caption}</div>
    </div>
  );
}
