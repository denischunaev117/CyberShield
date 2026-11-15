import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { scenarios } from "../src/content/scenarios";
import { pageNames, type PageId } from "../src/features/types";
import { type Locale, type Catalog, localeKey } from "../src/i18n/core";
import { progressStorageKey } from "../src/platform/progress";
import QRCode from "qrcode";
import { diagnosticQuestions } from "../src/content/diagnostic-questions";
import { classroomLessons } from "../src/content/classroom-lessons";
import { scenarioChannels } from "../src/engine";
// @ts-expect-error Node-only asset verification helper has no declarations.
import { verifyPublicSite } from "../scripts/verify-public-site.mjs";

test.describe.configure({ mode: "parallel" });

const catalogs = Object.fromEntries(
  ["ru", "en", "be"].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`src/i18n/catalogs/${locale}.json`, "utf8")),
  ]),
) as Record<Locale, Catalog>;
function text(locale: Locale, source: string) {
  if (locale === "ru" || !/[а-яёА-ЯЁ]/.test(source)) return source;
  const translated =
    catalogs[locale].messages[source.replace(/\s+/g, " ").trim()];
  if (!translated) throw Error(`Missing ${locale} test label: ${source}`);
  return translated;
}
async function initialise(
  page: Page,
  locale: Locale,
  theme = "light",
  lowVision = false,
) {
  await page.addInitScript(
    ({ locale, localeKey, theme, lowVision }) => {
      if (!localStorage.getItem(localeKey))
        localStorage.setItem(localeKey, locale);
      if (!localStorage.getItem("cybershield-preferences-v1"))
        localStorage.setItem(
          "cybershield-preferences-v1",
          JSON.stringify({ theme, lowVision }),
        );
    },
    { locale, localeKey, theme, lowVision },
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}
async function navigate(page: Page, locale: Locale, id: PageId) {
  let button = page
    .locator(".desktop-sidebar")
    .getByRole("button", { name: text(locale, pageNames[id]), exact: true });
  if (!(await button.isVisible())) {
    await page
      .getByRole("button", { name: text(locale, "Все разделы"), exact: true })
      .click();
    button = page
      .getByRole("dialog", { name: text(locale, "Все разделы"), exact: true })
      .getByRole("button", { name: text(locale, pageNames[id]), exact: true });
  }
  await button.click();
  await expect(
    page.locator("#main").getByRole("heading").first(),
  ).toBeVisible();
}
async function fits(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    )
    .toBeLessThanOrEqual(1);
}
async function startStory(page: Page, locale: Locale, id: string) {
  const story = scenarios.find((s) => s.id === id)!;
  await page
    .getByRole("textbox", { name: text(locale, "Поиск ситуаций") })
    .fill(text(locale, story.title));
  await expect(page.locator(".scenario-card")).toHaveCount(1);
  await page.locator(".scenario-card").click();
  const dialog = page.locator(".simulation-dialog");
  await dialog
    .getByRole("button", { name: text(locale, "Начать ситуацию"), exact: true })
    .click();
  await expect
    .poll(() =>
      dialog
        .locator(".simulation-top")
        .evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBeLessThan(180);
  return { story, dialog };
}
async function noRussian(locale: Locale, region: Locator) {
  if (locale === "en") {
    // Educational attachment names are technical identifiers, kept verbatim.
    const rendered = (await region.innerText()).replace(
      /[^\s"'«»<>]+\.(?:exe|apk|pdf|docx?)\b/gi,
      "",
    );
    expect(rendered).not.toMatch(/[а-яёА-ЯЁ]/);
  }
}

for (const locale of ["ru", "en", "be"] as const) {
  for (const theme of ["light", "dark"])
    for (const lowVision of [false, true])
      test(`${locale}: every section at 320px, ${theme}, lowVision=${lowVision}`, async ({
        page,
      }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: 320, height: 800 });
        await initialise(page, locale, theme, lowVision);
        for (const id of Object.keys(pageNames) as PageId[]) {
          await navigate(page, locale, id);
          await fits(page);
          await noRussian(locale, page.locator("#main"));
        }
      });
  test(`${locale}: local URL and QR checks preserve raw input and make no external request`, async ({
    page,
  }) => {
    const outside: string[] = [];
    page.on("request", (request) => {
      if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(request.url()).hostname))
        outside.push(request.url());
    });
    await initialise(page, locale);
    await navigate(page, locale, "link-check");
    const input = page.getByRole("textbox", {
      name: text(locale, "Ссылка для проверки"),
    });
    const raw = "https://belarusbank.by@evil.example/?token=private";
    await input.fill(raw);
    await page
      .getByRole("button", {
        name: text(locale, "Разобрать адрес"),
        exact: true,
      })
      .click();
    await expect(input).toHaveValue(raw);
    await expect(page.locator(".analysis-result")).toContainText(
      "evil.example",
    );
    await expect(page.locator(".analysis-result")).not.toContainText("private");
    const qr = await QRCode.toBuffer(
      "https://belarusbank.by.evil.example/pay",
      { width: 500, margin: 4 },
    );
    await page
      .getByLabel(
        text(locale, "Выбрать изображение: PNG, JPEG или WebP, до 10 МБ"),
      )
      .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: qr });
    await expect(input).toHaveValue("https://belarusbank.by.evil.example/pay");
    expect(outside).toEqual([]);
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("evil.example");
  });
  test(`${locale}: navigation and accessible labels are translated`, async ({
    page,
  }) => {
    await initialise(page, locale);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await expect(
      page.getByRole("textbox", { name: text(locale, "Поиск ситуаций") }),
    ).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      text(
        locale,
        "КиберЩит — практика безопасных решений для жителей Беларуси.",
      ),
    );
    await page.locator("#app-language").focus();
    await expect(page.locator("#app-language")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("switch", { name: text(locale, "Тёмная тема") }),
    ).toBeFocused();
  });
}

for (const locale of ["en", "be"] as const)
  for (const story of scenarios)
    test(`${locale}: all story content and a complete decision path — ${story.id}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await initialise(page, locale, "dark", true);
      const { dialog } = await startStory(page, locale, story.id);
      let node = story.start;
      while (!story.endings[node]) {
        const scene = story.nodes[node];
        const message = dialog
          .locator(
            scene.channel === "call" ||
              (!scene.channel && story.channel === "call")
              ? ".call-subtitles p"
              : ".chat-transcript .bubble.incoming",
          )
          .last();
        await expect(message).toContainText(text(locale, scene.message));
        for (const [index, choice] of scene.choices.entries())
          await expect(
            dialog.locator(".choices>button").nth(index),
          ).toContainText(text(locale, choice.text));
        await fits(page);
        await dialog.locator(".choices>button").first().click();
        node = scene.choices[0].next;
      }
      await expect(
        dialog.getByRole("heading", {
          name: text(locale, story.endings[node].title),
          exact: true,
        }),
      ).toBeVisible();
      // The language selector intentionally lists the names of all three languages.
      if (locale === "en") await noRussian(locale, dialog.locator(".debrief"));
    });

test("switching language during a call preserves the step, stops old audio and persists after reload", async ({
  page,
}) => {
  await initialise(page, "ru");
  const oldProgress = [
    {
      id: "friend-real",
      outcome: "safe",
      completedAt: "2026-11-01T10:00:00.000Z",
    },
  ];
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: progressStorageKey, value: oldProgress },
  );
  const { story, dialog } = await startStory(page, "ru", "call-bank");
  const audio = dialog.locator("audio");
  await dialog
    .getByRole("button", { name: text("ru", "Слушать реплику"), exact: true })
    .click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  for (const locale of ["en", "be", "ru"] as const) {
    await dialog.locator("#scenario-language").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(audio).toHaveAttribute(
      "src",
      new RegExp(
        `/audio/${locale === "ru" ? "" : locale + "/"}call-bank-start\\.mp3$`,
      ),
    );
    await expect
      .poll(() => audio.evaluate((a: HTMLAudioElement) => a.paused))
      .toBe(true);
    await expect(dialog.locator(".call-subtitles p")).toContainText(
      text(locale, story.nodes.start.message),
    );
    await expect(dialog.locator(".choices>button")).toHaveCount(
      story.nodes.start.choices.length,
    );
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        progressStorageKey,
      ),
    ).toEqual(oldProgress);
  }
  await dialog.locator("#scenario-language").selectOption("be");
  await dialog.locator(".choices>button").first().click();
  const next = story.nodes.start.choices[0].next;
  await expect(dialog.locator(".call-subtitles p")).toContainText(
    text("be", story.nodes[next].message),
  );
  await dialog.locator("#scenario-language").selectOption("en");
  await expect(dialog.locator(".call-subtitles p")).toContainText(
    text("en", story.nodes[next].message),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#app-language")).toHaveValue("en");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      progressStorageKey,
    ),
  ).toEqual(oldProgress);
});

for (const locale of ["ru", "en", "be"] as const) {
  test(`${locale}: translated topic and channel filters keep their canonical selections`, async ({
    page,
  }) => {
    await initialise(page, locale);
    const topic = scenarios.find((s) => s.id === "call-bank")!.topic;
    await page
      .locator(".topic-tabs")
      .getByRole("button", { name: text(locale, topic), exact: true })
      .click();
    await page
      .locator(".channels")
      .getByRole("button", { name: text(locale, "Звонки"), exact: true })
      .click();
    const expected = scenarios.filter(
      (s) => s.topic === topic && scenarioChannels(s).includes("call"),
    );
    await expect(page.locator(".scenario-card")).toHaveCount(expected.length);
    for (const story of expected)
      await expect(
        page.locator(".scenario-card").filter({
          has: page.getByRole("heading", {
            name: text(locale, story.title),
            exact: true,
          }),
        }),
      ).toHaveCount(1);
    await page
      .locator("#app-language")
      .selectOption(locale === "en" ? "be" : "en");
    await expect(page.locator(".scenario-card")).toHaveCount(expected.length);
  });
  test(`${locale}: assessment answers and teaching quiz retain IDs; print text is translated`, async ({
    page,
  }) => {
    await initialise(page, locale);
    await navigate(page, locale, "diagnostics");
    await page
      .getByRole("button", {
        name: text(locale, "Начать диагностику"),
        exact: true,
      })
      .click();
    for (let i = 0; i < 12; i++) {
      const prompt = await page
        .locator(".diagnostic-question legend")
        .textContent();
      const question = diagnosticQuestions.find(
        (q) => text(locale, q.prompt) === prompt,
      )!;
      expect(question).toBeTruthy();
      for (const option of question.options)
        await expect(
          page.getByRole("radio", {
            name: text(locale, option.text),
            exact: true,
          }),
        ).toHaveValue(option.id);
      await page.getByRole("radio").first().check();
      await page
        .getByRole("button", {
          name: text(locale, "Подтвердить ответ"),
          exact: true,
        })
        .click();
    }
    await navigate(page, locale, "classroom");
    await page.locator(".lesson-list button").first().click();
    await expect(page.locator(".lesson-sheet h2")).toHaveText(
      text(locale, classroomLessons[0].title),
    );
    await page
      .getByRole("button", {
        name: text(locale, "Открыть мини-квиз"),
        exact: true,
      })
      .click();
    for (const question of classroomLessons[0].quiz) {
      await page
        .getByRole("radio", {
          name: text(locale, question.options[0].text),
          exact: true,
        })
        .check();
      await page
        .getByRole("button", {
          name: text(locale, "Подтвердить ответ мини-квиза"),
          exact: true,
        })
        .click();
    }
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page
      .getByRole("button", {
        name: text(locale, "Распечатать методический лист"),
        exact: true,
      })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-print-sheet",
      "lesson",
    );
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".lesson-sheet")).toBeVisible();
    await noRussian(locale, page.locator(".lesson-sheet"));
  });
  test(`${locale}: production subdirectory loads the selected language and matching audio`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:4173/CyberShield/?lang=${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const { dialog } = await startStory(page, locale, "call-bank");
    const audio = dialog.locator("audio");
    await expect(audio).toHaveAttribute(
      "src",
      new RegExp(
        `/CyberShield/audio/${locale === "ru" ? "" : locale + "/"}call-bank-start\\.mp3$`,
      ),
    );
    await dialog
      .getByRole("button", {
        name: text(locale, "Слушать реплику"),
        exact: true,
      })
      .click();
    await expect
      .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
      .toBeGreaterThan(0);
    const nextLocale = locale === "en" ? "be" : "en";
    await dialog.locator("#scenario-language").selectOption(nextLocale);
    await expect(page).toHaveURL(new RegExp(`lang=${nextLocale}`));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", nextLocale);
    await expect(page.locator("#app-language")).toHaveValue(nextLocale);
  });
}

test("production subdirectory serves all 96 intact MP3 files and production assets", async () => {
  const result = await verifyPublicSite("http://127.0.0.1:4173/CyberShield/");
  expect(result.clips).toBe(96);
  expect(result.assets).toBeGreaterThan(0);
});
