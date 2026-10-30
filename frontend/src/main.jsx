import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import BackgroundFx from "./components/BackgroundFx.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BackgroundFx />
    <App />
  </React.StrictMode>
);
