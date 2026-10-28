export default function MetricCard({ label, value, unit = "MW", hint, tone, loading }) {
  return (
    <div className={`card ${tone ? `card-${tone}` : ""}`}>
      <div className="card-label">
        {label}
        {hint && (
          <span className="info" tabIndex={0} aria-label={hint}>
            i
            <span className="tip" role="tooltip">
              {hint}
            </span>
          </span>
        )}
      </div>
      <div className="card-value">
        {loading ? <span className="skeleton" /> : value}
        {!loading && value !== "-" && <span className="unit"> {unit}</span>}
      </div>
    </div>
  );
}
