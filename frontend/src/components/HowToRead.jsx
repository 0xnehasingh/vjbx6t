export default function HowToRead() {
  return (
    <section className="panel how" aria-labelledby="how-title">
      <h2 id="how-title">How to read this</h2>
      <div className="how-grid">
        <div>
          <h3>The question</h3>
          <p>
            A buyer commits to power the day before. The forecast that matters is the one you could really
            have seen at that moment, not a later, better one. Each chart compares that forecast with what
            wind actually generated.
          </p>
        </div>
        <div>
          <h3>Horizon mode</h3>
          <p>
            Pick how far ahead you want to look. At 6 h, each time uses the newest forecast published at
            least 6 h earlier. Forecasts older than 48 h are never used.
          </p>
        </div>
        <div>
          <h3>Day-ahead mode</h3>
          <p>
            Pick a decision time, such as 09:00. Every half-hour of day D uses the newest forecast published
            by that time on day D-1. January UK time is the same as UTC.
          </p>
        </div>
        <div>
          <h3>Error and shading</h3>
          <p>
            Error is forecast minus actual. Amber shading means the forecast was too high, so less wind
            arrived than planned. Blue shading means it was too low.
          </p>
        </div>
      </div>
      <p className="help">
        Data: Elexon BMRS, FUELHH (actual wind, every 30 min) and WINDFOR (wind forecast, hourly, each with a
        publish time). Each hourly forecast is used for both half-hours of that hour.
      </p>
    </section>
  );
}
