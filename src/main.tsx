import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope";
import "./style.css";
import "./experience.css";
import "./styles/features.css";
import { applyPreferences, readPreferences } from "./platform/preferences";
applyPreferences(readPreferences());
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
