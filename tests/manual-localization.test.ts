import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/catalogs/en.json";
import be from "../src/i18n/catalogs/be.json";
import enReviewed from "../src/i18n/overrides/en.json";
import beReviewed from "../src/i18n/overrides/be.json";
import audio from "../src/i18n/overrides/audio.json";
import { scenarios } from "../src/content/scenarios";

function visibleStrings(value: unknown): string[] {
  if (typeof value === "string")
    return /[а-яёА-ЯЁ]/.test(value) ? [value.replace(/\s+/g, " ").trim()] : [];
  if (Array.isArray(value)) return value.flatMap(visibleStrings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(visibleStrings);
  return [];
}
for (const [locale, catalog, reviewed] of [
  ["en", en, enReviewed],
  ["be", be, beReviewed],
] as const) {
  test(`${locale}: every branch, choice, ending and lesson of all 100 stories is translated`, () => {
    const selected = scenarios;
    assert.equal(selected.length, 100);
    const messages: Record<string, string> = catalog.messages;
    for (const story of selected)
      for (const source of visibleStrings(story))
        assert.ok(messages[source]?.trim(), `${story.id}: ${source}`);
  });
  test(`${locale}: reviewed translations and voice scripts are preserved without broken placeholders`, () => {
    for (const kind of ["messages", "templates"] as const) {
      const values: Record<string, string> = catalog[kind];
      for (const [source, translated] of Object.entries(reviewed[kind])) {
        assert.equal(values[source], translated, source);
        assert.ok(translated.trim(), source);
        assert.deepEqual(
          translated.match(/\{\d+\}/g)?.sort() ?? [],
          source.match(/\{\d+\}/g)?.sort() ?? [],
          source,
        );
      }
    }
    const messages: Record<string, string> = catalog.messages;
    for (const row of Object.values(audio))
      assert.equal(messages[row.ru], row[locale], row.ru);
  });
}
