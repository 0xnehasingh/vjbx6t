export default function Panel({ title, subtitle, children, className = "", busy }) {
  return (
    <section className={`panel ${busy ? "panel-loading" : ""} ${className}`} aria-busy={busy || undefined}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="panel-sub">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
