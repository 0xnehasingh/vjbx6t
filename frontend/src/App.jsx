import { useState } from "react";

export default function App() {
  const [message, setMessage] = useState("");

  return (
    <main className="page">
      <h1>Wind Generation Forecast Monitor</h1>
      <p className="subtitle">UK national wind generation: forecast vs actual</p>
      <button type="button" onClick={() => setMessage("Coming soon")}>
        Load data
      </button>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
