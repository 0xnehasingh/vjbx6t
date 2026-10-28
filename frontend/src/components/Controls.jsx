import { MIN_DATE, MAX_DATE, MAX_HORIZON } from "../lib/constants.js";

export default function Controls({ start, end, horizon, onChange }) {
  const startChange = (e) => {
    const v = e.target.value;
    if (!v) return;
    onChange({ start: v, end: v > end ? v : end });
  };
  const endChange = (e) => {
    const v = e.target.value;
    if (!v) return;
    onChange({ end: v, start: v < start ? v : start });
  };

  return (
    <section className="controls" aria-label="Controls">
      <div className="control">
        <label htmlFor="start">From</label>
        <input id="start" type="date" min={MIN_DATE} max={MAX_DATE} value={start} onChange={startChange} />
      </div>
      <div className="control">
        <label htmlFor="end">To</label>
        <input id="end" type="date" min={MIN_DATE} max={MAX_DATE} value={end} onChange={endChange} />
      </div>
      <div className="control control-wide">
        <label htmlFor="horizon">
          Forecast horizon
          <span className="badge">{horizon} h</span>
        </label>
        <input
          id="horizon"
          type="range"
          min="0"
          max={MAX_HORIZON}
          step="1"
          value={horizon}
          onChange={(e) => onChange({ horizon: Number(e.target.value) })}
        />
        <div className="range-ends">
          <span>0 h</span>
          <span>48 h</span>
        </div>
        <p className="help">
          Uses the latest forecast published at least {horizon} h before each time.
        </p>
      </div>
    </section>
  );
}
