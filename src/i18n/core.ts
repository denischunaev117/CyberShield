import manifest from "./catalogs/manifest.json" with { type: "json" };
export type Locale = "ru" | "en" | "be";
export type Catalog = {
  sourceHash?: string;
  messages: Record<string, string>;
  templates: Record<string, string>;
};
export const localeKey = "cybershield-locale-v1";
let locale: Locale = "ru",
  catalog: Catalog = { messages: {}, templates: {} };
const listeners = new Set<() => void>();
let request = 0;
export const currentLocale = () => locale;
export const intlLocale = () =>
  locale === "be" ? "be-BY" : locale === "en" ? "en-GB" : "ru-BY";
export const subscribeLocale = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const normalized = (s: string) => s.replace(/\s+/g, " ").trim();
let patterns: { regex: RegExp; text: string }[] = [];
function compileTemplates(templates: Record<string, string>) {
  return Object.entries(templates).map(([source, text]) => ({
    regex: new RegExp(
      "^" +
        source
          .split(/(\{\d+\})/)
          .map((part) =>
            /^\{\d+\}$/.test(part)
              ? "(.*?)"
              : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          )
          .join("") +
        "$",
    ),
    text,
  }));
}
export function translateText(text: string): string {
  if (locale === "ru" || !text || !/[а-яёА-ЯЁ]/.test(text)) return text;
  const key = normalized(text),
    found = catalog.messages[key];
  if (found !== undefined)
    return text.match(/^\s*/)?.[0] + found + (text.match(/\s*$/)?.[0] ?? "");
  for (const pattern of patterns) {
    const match = pattern.regex.exec(key);
    if (match)
      return pattern.text.replace(/\{(\d+)\}/g, (_, i) =>
        translateText(match[Number(i) + 1] ?? ""),
      );
  }
  return text;
}
export async function setLocale(next: Locale) {
  if (!["ru", "en", "be"].includes(next)) throw Error("Неподдерживаемый язык.");
  const revision = ++request;
  const data: Catalog =
    next === "ru"
      ? { messages: {}, templates: {} }
      : next === "en"
        ? (await import("./catalogs/en.json", { with: { type: "json" } }))
            .default
        : (await import("./catalogs/be.json", { with: { type: "json" } }))
            .default;
  if (revision !== request) return;
  if (
    next !== "ru" &&
    (data.sourceHash !== manifest.sourceHash ||
      Object.keys(data.messages).length !== manifest.messages ||
      Object.keys(data.templates).length !== manifest.templates)
  )
    throw Error(
      "Языковой пакет ещё не готов полностью. Неполный перевод не включён.",
    );
  catalog = data;
  patterns = compileTemplates(data.templates);
  locale = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.title = translateText("КиберЩит — практика безопасных решений");
  }
  try {
    localStorage.setItem(localeKey, next);
  } catch {
    /* Displayed by the selector; no progress is reset. */
  }
  listeners.forEach((fn) => fn());
}
export function savedLocale(): Locale {
  if (typeof location !== "undefined") {
    const explicit = new URLSearchParams(location.search).get("lang");
    if (explicit === "en" || explicit === "be" || explicit === "ru")
      return explicit;
  }
  try {
    const value = localStorage.getItem(localeKey);
    return value === "en" || value === "be" ? value : "ru";
  } catch {
    return "ru";
  }
}
export function installCatalogForTest(next: Locale, data: Catalog) {
  catalog = data;
  locale = next;
  patterns = compileTemplates(data.templates);
}
