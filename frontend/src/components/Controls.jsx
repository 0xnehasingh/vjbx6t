import {
  CUTOFF_CHOICES,
  MAX_DT,
  MAX_HORIZON,
  MIN_DT,
  PRESETS,
} from "../lib/constants.js";
import { clampInput, parseLocalUtc, toInputValue } from "../lib/format.js";

const DAY = 86400000;

export default function Controls({ start, end, mode, horizon, cutoff, onChange }) {
  const setStart = (raw) => {
    const v = clampInput(raw, MIN_DT, MAX_DT);
    if (!v) return;
    onChange({ start: v, end: v > end ? v : end });
  };
  const setEnd = (raw) => {
    const v = clampInput(raw, MIN_DT, MAX_DT);
    if (!v) return;
    onChange({ end: v, start: v < start ? v : start });
  };
  const setCutoff = (raw) => {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) onChange({ cutoff: raw });
  };
  const wholeDay = () => {
    const dayStart = Math.floor(parseLocalUtc(start) / DAY) * DAY;
    onChange({ start: toInputValue(dayStart), end: toInputValue(dayStart + DAY - 30 * 60000) });
  };
  const isDay =
    start.slice(0, 10) === end.slice(0, 10) && start.endsWith("T00:00") && end.endsWith("T23:30");
  const activePreset = PRESETS.find((p) => p.start === start && p.end === end)?.id;

  return (
    <section className="controls" aria-label="Controls">
      <div className="controls-block">
        <div className="control">
          <span className="control-title" id="mode-label">Forecast rule</span>
          <div className="segmented" role="radiogroup" aria-labelledby="mode-label">
            {[
              ["horizon", "Horizon"],
              ["dayahead", "Day-ahead"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                className={`seg ${mode === value ? "seg-on" : ""}`}
                onClick={() => onChange({ mode: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "horizon" ? (
          <div className="control control-grow">
            <label htmlFor="horizon" className="control-title">
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
              aria-valuetext={`${horizon} hours`}
              onChange={(e) => onChange({ horizon: Number(e.target.value) })}
            />
            <div className="range-ends" aria-hidden="true">
              <span>0 h</span>
              <span>24 h</span>
              <span>48 h</span>
            </div>
            <p className="help">
              For each time, uses the latest forecast published at least {horizon} h earlier.
            </p>
          </div>
        ) : (
          <div className="control control-grow">
            <label htmlFor="cutoff" className="control-title">
              Decision time on the day before (UTC)
            </label>
            <div className="cutoff-row">
              <input
                id="cutoff"
                type="time"
                value={cutoff}
                step="900"
                onChange={(e) => setCutoff(e.target.value)}
              />
              <div className="chips" role="group" aria-label="Common decision times">
                {CUTOFF_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${cutoff === c ? "chip-on" : ""}`}
                    aria-pressed={cutoff === c}
                    onClick={() => onChange({ cutoff: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="help">
              For every time on day D, uses the latest forecast published by {cutoff} UTC on day D-1.
              Same as UK time in January.
            </p>
          </div>
        )}
      </div>

      <div className="controls-block">
        <div className="control">
          <label htmlFor="start" className="control-title">From (UTC)</label>
          <input
            id="start"
            type="datetime-local"
            min={MIN_DT}
            max={MAX_DT}
            step="1800"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="control">
          <label htmlFor="end" className="control-title">To (UTC)</label>
          <input
            id="end"
            type="datetime-local"
            min={MIN_DT}
            max={MAX_DT}
            step="1800"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div className="control control-grow">
          <span className="control-title" id="presets-label">Quick ranges</span>
          <div className="chips" role="group" aria-labelledby="presets-label">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip ${activePreset === p.id ? "chip-on" : ""}`}
                aria-pressed={activePreset === p.id}
                title={p.hint}
                onClick={() => onChange({ start: p.start, end: p.end })}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${isDay ? "chip-on" : ""}`}
              aria-pressed={isDay}
              title="The whole day that From is on"
              onClick={wholeDay}
            >
              Single day
            </button>
          </div>
          <p className="help">Limited to 1 Jan 00:00 - 31 Jan 23:30 2026. Actuals are half-hourly.</p>
        </div>
      </div>
    </section>
  );
}
