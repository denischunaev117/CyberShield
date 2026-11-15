import { currentLocale, type Locale } from "./core";
export function localizedAudio(
  path: string,
  locale: Locale = currentLocale(),
): string {
  if (locale === "ru") return path;
  return path.replace(/^audio\//, `audio/${locale}/`);
}
