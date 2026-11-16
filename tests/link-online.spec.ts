import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import QRCode from "qrcode";
import { localeKey, type Catalog, type Locale } from "../src/i18n/core";

test.describe.configure({ mode: "parallel" });

const endpoint =
  "https://cybershield-link-check.chunaevdenis.workers.dev/check";
const catalogs = Object.fromEntries(
  ["en", "be"].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`src/i18n/catalogs/${locale}.json`, "utf8")),
  ]),
) as Record<"en" | "be", Catalog>;
function text(locale: Locale, source: string) {
  if (locale === "ru") return source;
  const translated =
    catalogs[locale].messages[source.replace(/\s+/g, " ").trim()];
  if (!translated) throw new Error(`Missing ${locale} online label: ${source}`);
  return translated;
}
async function open(
  page: Page,
  locale: Locale = "ru",
  theme = "light",
  lowVision = false,
) {
  await page.addInitScript(
    ({ locale, localeKey, theme, lowVision }) => {
      localStorage.setItem(localeKey, locale);
      localStorage.setItem(
        "cybershield-preferences-v1",
        JSON.stringify({ theme, lowVision }),
      );
    },
    { locale, localeKey, theme, lowVision },
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  const name = text(locale, "Проверить ссылку или QR-код");
  let button = page
    .locator(".desktop-sidebar")
    .getByRole("button", { name, exact: true });
  if (!(await button.isVisible())) {
    await page
      .getByRole("button", {
        name: text(locale, "Все разделы"),
        exact: true,
      })
      .click();
    button = page
      .getByRole("dialog", { name: text(locale, "Все разделы") })
      .getByRole("button", { name, exact: true });
  }
  await button.click();
}
function control(verdict = "no_known_threats") {
  return {
    verdict,
    provider: "google-safe-browsing",
    checkedAt: new Date().toISOString(),
    threatTypes: verdict === "dangerous" ? ["SOCIAL_ENGINEERING"] : [],
    scope: "submitted-url-only",
    redirectsChecked: false,
  };
}
async function respond(route: Route, data: unknown, status = 200) {
  const origin = new URL(
    route.request().headers().origin ?? "http://127.0.0.1:5173",
  ).origin;
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(data),
  });
}
async function mock(
  page: Page,
  handler: (route: Route, body: Record<string, unknown>) => Promise<void>,
) {
  const posts: Record<string, unknown>[] = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await respond(route, { ok: true });
      return;
    }
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["content-type"]).toContain(
      "application/json",
    );
    const body = route.request().postDataJSON();
    posts.push(body);
    await handler(route, body);
  });
  return posts;
}
function input(page: Page, locale: Locale = "ru") {
  return page.getByRole("textbox", {
    name: text(locale, "Ссылка для проверки"),
  });
}
function online(page: Page, locale: Locale = "ru") {
  return page.getByRole("button", {
    name: text(locale, "Проверить онлайн"),
    exact: true,
  });
}
function verdict(page: Page, locale: Locale, source: string) {
  return page.getByRole("heading", { name: text(locale, source), exact: true });
}

for (const locale of ["ru", "en", "be"] as const) {
  test(`${locale}: online check is explicit, preserves raw input and does not expose it in storage`, async ({
    page,
  }) => {
    const outside: string[] = [];
    page.on("request", (request) => {
      if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(request.url()).hostname))
        outside.push(request.url());
    });
    const posts = await mock(page, (route) => respond(route, control()));
    await open(page, locale);
    await input(page, locale).fill("ozon-zakaz.by");
    expect(posts).toEqual([]);
    await page
      .getByRole("button", {
        name: text(locale, "Разобрать адрес"),
        exact: true,
      })
      .click();
    await expect(page.locator(".url-details")).toContainText("ozon-zakaz.by");
    expect(posts).toEqual([]);
    expect(outside).toEqual([]);
    await online(page, locale).click();
    await expect(verdict(page, locale, "Угроз не обнаружено")).toBeVisible();
    await expect(page.getByTestId("link-online-result")).toContainText(
      text(
        locale,
        "Проверен переданный адрес. Перенаправления и содержимое страницы не проверялись.",
      ),
    );
    await expect(page.getByTestId("link-online-result")).toContainText(
      "Google",
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].consent).toBe(true);
    expect(String(posts[0].url)).toContain("ozon-zakaz.by");
    await expect(input(page, locale)).toHaveValue("ozon-zakaz.by");
    expect(outside.every((url) => url === endpoint)).toBe(true);
    expect(
      await page.evaluate(() =>
        JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
          href: location.href,
        }),
      ),
    ).not.toContain("ozon-zakaz.by");
  });

  test(`${locale}: confirmed phishing has a distinct dangerous result`, async ({
    page,
  }) => {
    await mock(page, (route) => respond(route, control("dangerous")));
    await open(page, locale);
    await input(page, locale).fill("https://example.com/test-phishing");
    await online(page, locale).click();
    await expect(
      verdict(page, locale, "Ссылка может быть опасной"),
    ).toBeVisible();
    await expect(verdict(page, locale, "Угроз не обнаружено")).toHaveCount(0);
    await expect(input(page, locale)).toHaveValue(
      "https://example.com/test-phishing",
    );
  });
}

test("QR contents stay on device until the online check is explicitly requested", async ({
  page,
}) => {
  const posts = await mock(page, (route) => respond(route, control()));
  await open(page);
  const raw = "https://example.com/qr-order?item=raw-value-123";
  const buffer = await QRCode.toBuffer(raw, { width: 500, margin: 4 });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({ name: "online-qr.png", mimeType: "image/png", buffer });
  await expect(input(page)).toHaveValue(raw);
  expect(posts).toEqual([]);
  await online(page).click();
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toBe(raw);
  expect(posts[0].consent).toBe(true);
  expect(JSON.stringify(posts[0])).not.toContain("base64");
  expect(JSON.stringify(posts[0])).not.toContain("online-qr.png");
});

test("a completed online result changes language without resending the address", async ({
  page,
}) => {
  const posts = await mock(page, (route) => respond(route, control()));
  await open(page);
  const raw = "https://example.com/unchanged-order?item=raw-value-123";
  await input(page).fill(raw);
  await online(page).click();
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toBeVisible();
  for (const locale of ["ru", "en", "be"] as const) {
    await page.locator("#app-language").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(verdict(page, locale, "Угроз не обнаружено")).toBeVisible();
    const result = page.getByTestId("link-online-result");
    await expect(result).toContainText(
      text(
        locale,
        "Проверен переданный адрес. Перенаправления и содержимое страницы не проверялись.",
      ),
    );
    await expect(
      result.getByRole("link", {
        name: text(locale, "Рекомендации, предоставленные Google"),
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "https://developers.google.com/safe-browsing/v4/advisory",
    );
    await expect(input(page, locale)).toHaveValue(raw);
    expect(posts).toHaveLength(1);
  }
});

test("pending online check disables OCR and can be cleared and restarted after a QR upload", async ({
  page,
}) => {
  let release = () => {};
  let finish = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const completed = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let number = 0;
  const posts = await mock(page, async (route) => {
    if (++number === 1) {
      await held;
      await respond(route, control("dangerous")).catch(() => {});
      finish();
    } else await respond(route, control());
  });
  await open(page);
  const raw = "https://example.com/qr-pending";
  const buffer = await QRCode.toBuffer(raw, { width: 500, margin: 4 });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({ name: "pending-qr.png", mimeType: "image/png", buffer });
  await expect(input(page)).toHaveValue(raw);
  const ocr = page.getByRole("button", {
    name: "Найти ссылку в тексте изображения",
    exact: true,
  });
  await expect(ocr).toBeEnabled();
  await online(page).click();
  await expect.poll(() => posts.length).toBe(1);
  await expect(page.getByTestId("link-online-result")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(ocr).toBeDisabled();
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(input(page)).toHaveValue("");
  await expect(page.getByTestId("link-online-result")).toHaveCount(0);
  await expect(online(page)).toBeEnabled();
  release();
  await completed;
  await expect(page.getByTestId("link-online-result")).toHaveCount(0);
  await input(page).fill("https://example.com/fresh-after-clear");
  await online(page).click();
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toBeVisible();
  await expect(verdict(page, "ru", "Ссылка может быть опасной")).toHaveCount(0);
  expect(posts).toHaveLength(2);
});

for (const address of [
  "https://user:private-password@example.com/",
  "https://example.com/?token=must-stay-local",
  "https://example.com/?code=must-stay-local",
])
  test(`credentials and sensitive URL parameters stay local: ${address}`, async ({
    page,
  }) => {
    const posts = await mock(page, (route) => respond(route, control()));
    await open(page);
    await input(page).fill(address);
    await online(page).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(posts).toEqual([]);
    await expect(input(page)).toHaveValue(address);
  });

for (const [label, status, body] of [
  [
    "service unavailable",
    503,
    { verdict: "unavailable", error: "provider_unavailable" },
  ],
  ["quota exhausted", 429, { verdict: "unavailable", error: "rate_limited" }],
  ["empty response", 200, {}],
  ["unknown provider", 200, { ...control(), provider: "untrusted-provider" }],
  ["missing threat details", 200, { ...control("dangerous"), threatTypes: [] }],
] as const)
  test(`online ${label} is never represented as a successful safe result`, async ({
    page,
  }) => {
    await mock(page, (route) => respond(route, body, status));
    await open(page);
    await input(page).fill("https://example.com/");
    await online(page).click();
    await expect(
      verdict(page, "ru", "Не удалось завершить проверку"),
    ).toBeVisible();
    await expect(verdict(page, "ru", "Угроз не обнаружено")).toHaveCount(0);
    await expect(verdict(page, "ru", "Ссылка может быть опасной")).toHaveCount(
      0,
    );
  });

test("editing and resubmitting ignores a late result for an older address", async ({
  page,
}) => {
  let release = () => {};
  let finish = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const completed = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let number = 0;
  const posts = await mock(page, async (route) => {
    const current = ++number;
    if (current === 1) {
      await held;
      await respond(route, control("dangerous")).catch(() => {});
      finish();
    } else await respond(route, control());
  });
  await open(page);
  await input(page).fill("https://example.com/old-address");
  await online(page).click();
  await expect.poll(() => posts.length).toBe(1);
  await input(page).fill("https://example.com/new-address");
  await online(page).click();
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toBeVisible();
  release();
  await completed;
  await expect(verdict(page, "ru", "Ссылка может быть опасной")).toHaveCount(0);
  await expect(input(page)).toHaveValue("https://example.com/new-address");
});

for (const action of ["clear", "hide", "leave"] as const)
  test(`a pending online result cannot reappear after ${action}`, async ({
    page,
  }) => {
    let release = () => {};
    let finish = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const completed = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const posts = await mock(page, async (route) => {
      await held;
      await respond(route, control("dangerous")).catch(() => {});
      finish();
    });
    await open(page);
    await input(page).fill("https://example.com/pending");
    await online(page).click();
    await expect.poll(() => posts.length).toBe(1);
    if (action === "clear")
      await page.getByRole("button", { name: "Очистить", exact: true }).click();
    else if (action === "leave")
      await page
        .getByRole("button", { name: "Назад к практике", exact: true })
        .click();
    else
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          value: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
    release();
    await completed;
    await expect(verdict(page, "ru", "Ссылка может быть опасной")).toHaveCount(
      0,
    );
    await expect(verdict(page, "ru", "Угроз не обнаружено")).toHaveCount(0);
    if (action === "clear") await expect(input(page)).toHaveValue("");
  });

test("successful online results expire rather than remaining an indefinite assurance", async ({
  page,
}) => {
  await mock(page, (route) => respond(route, control()));
  await open(page);
  await page.clock.install();
  await input(page).fill("https://example.com/");
  await online(page).click();
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toBeVisible();
  await page.clock.fastForward(26 * 60 * 1000);
  await expect(verdict(page, "ru", "Угроз не обнаружено")).toHaveCount(0);
});

for (const locale of ["ru", "en", "be"] as const)
  for (const theme of ["light", "dark"])
    for (const lowVision of [false, true])
      test(`${locale}: online results fit 320px in ${theme}, lowVision=${lowVision}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 900 });
        await mock(page, (route) => respond(route, control()));
        await open(page, locale, theme, lowVision);
        await input(page, locale).fill(
          "https://example.com/a-long-path-for-mobile-layout",
        );
        await online(page, locale).focus();
        await page.keyboard.press("Enter");
        await expect(
          verdict(page, locale, "Угроз не обнаружено"),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        const audit = await new AxeBuilder({ page })
          .include("#main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(audit.violations).toEqual([]);
        if (locale === "en")
          expect(await page.locator("#main").innerText()).not.toMatch(
            /[а-яёА-ЯЁ]/,
          );
      });
