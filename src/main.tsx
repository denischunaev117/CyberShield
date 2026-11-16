import { savedLocale, setLocale, localeKey } from "./i18n/core";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope";
import "./style.css";
import "./experience.css";
import "./styles/features.css";
import "./styles/refinement.css";
import { applyPreferences, readPreferences } from "./platform/preferences";
import { initializeNativeApp, isNativeApp } from "./platform/native";
applyPreferences(readPreferences());
void initializeNativeApp()
  .catch(() => {})
  .then(() => {
    try {
      if (isNativeApp() && !localStorage.getItem(localeKey)) {
        const systemLanguage = navigator.language.split("-")[0];
        if (["ru", "en", "be"].includes(systemLanguage))
          localStorage.setItem(localeKey, systemLanguage);
      }
    } catch {
      /* The default locale still works when storage is unavailable. */
    }
    return setLocale(savedLocale());
  })
  .catch(() => {})
  .then(() =>
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
