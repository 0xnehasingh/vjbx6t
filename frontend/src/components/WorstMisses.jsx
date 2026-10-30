import { fmtDateTime, fmtMW, fmtSigned } from "../lib/format.js";

export default function WorstMisses({ rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">The ten largest forecast misses in the selected period</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Time (UTC)</th>
            <th scope="col" className="num">Actual</th>
            <th scope="col" className="num">Forecast</th>
            <th scope="col" className="num">Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.startTime}>
              <td>{i + 1}</td>
              <td>{fmtDateTime(Date.parse(r.startTime))}</td>
              <td className="num">{fmtMW(r.actual)}</td>
              <td className="num">{fmtMW(r.forecast)}</td>
              <td className={`num ${r.error > 0 ? "err-high" : "err-low"}`}>
                {fmtSigned(r.error)} MW
                <span className="sr-only">{r.error > 0 ? " (forecast too high)" : " (forecast too low)"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
