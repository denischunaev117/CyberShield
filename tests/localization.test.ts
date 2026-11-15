import { test } from "node:test";
import assert from "node:assert/strict";
import {
  translateText,
  installCatalogForTest,
  currentLocale,
} from "../src/i18n/core";
import { localizedProps } from "../src/i18n/jsx-runtime";
import { localizedAudio } from "../src/i18n/audio";
import { lessonPublicUrl } from "../src/features/classroom/engine";
import { classroomLessons } from "../src/content/classroom-lessons";
const data = {
  messages: { Практика: "Practice", Назад: "Back" },
  templates: { "Пройдено {0} из {1}": "Completed {0} of {1}" },
};
test("lookup preserves whitespace, template values, and the canonical data strings", () => {
  try {
    installCatalogForTest("en", data);
    assert.equal(translateText(" Практика "), " Practice ");
    assert.equal(translateText("Пройдено 2 из 10"), "Completed 2 of 10");
    assert.equal(
      translateText("https://example.com/x"),
      "https://example.com/x",
    );
  } finally {
    installCatalogForTest("ru", { messages: {}, templates: {} });
  }
});
test("render localization does not translate user values, links, IDs, or handlers", () => {
  try {
    installCatalogForTest("en", data);
    const click = () => {};
    const next = localizedProps("button", {
      "aria-label": "Назад",
      children: "Практика",
      onClick: click,
      id: "practice",
    }) as Record<string, unknown>;
    assert.equal(next.children, "Practice");
    assert.equal(next["aria-label"], "Back");
    assert.equal(next.onClick, click);
    assert.equal(next.id, "practice");
    const raw = { children: "Практика", "data-i18n": "off" };
    assert.equal(localizedProps("p", raw), raw);
    assert.equal(
      (
        localizedProps("input", { value: "Практика" }) as Record<
          string,
          unknown
        >
      ).value,
      "Практика",
    );
    const option = localizedProps("option", { children: "Практика" }) as Record<
      string,
      unknown
    >;
    assert.equal(option.children, "Practice");
    assert.equal(option.value, "Практика");
  } finally {
    installCatalogForTest("ru", { messages: {}, templates: {} });
  }
});
test("localized audio uses explicit corresponding files; lesson links carry only public language and lesson", () => {
  assert.equal(
    localizedAudio("audio/call-bank-start.mp3", "be"),
    "audio/be/call-bank-start.mp3",
  );
  assert.equal(
    localizedAudio("audio/call-bank-start.mp3", "en"),
    "audio/en/call-bank-start.mp3",
  );
  assert.equal(currentLocale(), "ru");
  const u = new URL(lessonPublicUrl(classroomLessons[0].id, "be"));
  assert.deepEqual([...u.searchParams.keys()], ["lesson", "lang"]);
  assert.equal(u.searchParams.get("lang"), "be");
});
