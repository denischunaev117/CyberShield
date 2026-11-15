import { useState, useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { currentLocale, setLocale, subscribeLocale, type Locale } from "./core";
export default function LanguageSelector() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    currentLocale,
    currentLocale,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="language-selector">
      <Languages size={21} />
      <label htmlFor="app-language">Язык</label>
      <select
        id="app-language"
        aria-label="Язык приложения"
        value={locale}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          setError("");
          try {
            await setLocale(e.target.value as Locale);
          } catch {
            setError(
              "Не удалось загрузить язык. Проверьте подключение и повторите.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="ru" lang="ru">
          Русский
        </option>
        <option value="be" lang="be" data-i18n="off">
          Беларуская
        </option>
        <option value="en" lang="en" data-i18n="off">
          English
        </option>
      </select>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
