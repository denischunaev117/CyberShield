import { test, expect, type Page, type Route } from "@playwright/test";
import { scenarios } from "../src/content/scenarios";

test.describe.configure({ mode: "parallel" });

const endpoint =
  "https://cybershield-link-check.chunaevdenis.workers.dev/check";

async function back(page: Page) {
  return page.evaluate(() => {
    const event = new CustomEvent("cybershield:native-back", {
      cancelable: true,
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function suspend(page: Page) {
  expect(await page.evaluate(() => document.hidden)).toBe(false);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("cybershield:native-pause")),
  );
}

async function navigate(page: Page, name: string) {
  let button = page
    .locator(".desktop-sidebar")
    .getByRole("button", { name, exact: true });
  if (!(await button.isVisible())) {
    await page
      .getByRole("button", { name: "Все разделы", exact: true })
      .click();
    button = page
      .getByRole("dialog", { name: "Все разделы" })
      .getByRole("button", { name, exact: true });
  }
  await button.click();
}

async function openCall(page: Page) {
  const story = scenarios.find((scenario) => scenario.id === "call-bank")!;
  await page.goto("/");
  await page.getByRole("textbox", { name: "Поиск ситуаций" }).fill(story.title);
  await expect(page.locator(".scenario-card")).toHaveCount(1);
  await page.locator(".scenario-card").click();
  const dialog = page.locator(".simulation-dialog");
  await dialog
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  return { story, dialog };
}

test("native Back closes menu and settings before changing the current page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const catalogHeading = await page.locator("#main h1").innerText();
  await page.getByRole("button", { name: "Все разделы", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Все разделы" })).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(
    page.getByRole("dialog", { name: "Все разделы" }),
  ).not.toBeVisible();
  await expect(page.locator("#main h1")).toHaveText(catalogHeading);

  await page.getByRole("button", { name: "Все разделы", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Все разделы" })
    .getByRole("button", { name: "Настройки удобства", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Настройки удобства" }),
  ).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(
    page.getByRole("dialog", { name: "Настройки удобства" }),
  ).not.toBeVisible();
  await expect(page.locator("#main h1")).toHaveText(catalogHeading);
  expect(await back(page)).toBe(false);
});

test("native Back returns a feature to practice and leaves root Back available to Android", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Проверить ссылку или QR-код");
  await expect(
    page.getByRole("heading", {
      name: "Проверить ссылку или QR-код",
      exact: true,
    }),
  ).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator(".feature-page")).toHaveCount(0);
  await expect(page.locator(".scenario-card").first()).toBeVisible();
  expect(await back(page)).toBe(false);
});

test("native Back pauses a running story, preserves its step on resume and closes on the next Back", async ({
  page,
}) => {
  const { story, dialog } = await openCall(page);
  const choice = story.nodes[story.start].choices.find(
    (candidate) => story.nodes[candidate.next],
  )!;
  await dialog
    .locator(".choices > button")
    .filter({ hasText: choice.text })
    .click();
  const before = await dialog.locator(".call-subtitles p").innerText();
  const choices = await dialog.locator(".choices > button").allTextContents();
  const progress = await page.evaluate(() =>
    localStorage.getItem("cybershield-progress-v1"),
  );
  expect(await back(page)).toBe(true);
  await expect(
    dialog.getByRole("heading", { name: "Можно сделать паузу", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator("audio")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Продолжить эту ситуацию", exact: true })
    .click();
  await expect(dialog.locator(".call-subtitles p")).toHaveText(before);
  expect(await dialog.locator(".choices > button").allTextContents()).toEqual(
    choices,
  );
  expect(
    await page.evaluate(() => localStorage.getItem("cybershield-progress-v1")),
  ).toBe(progress);

  expect(await back(page)).toBe(true);
  await expect(
    dialog.getByRole("heading", { name: "Можно сделать паузу", exact: true }),
  ).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".scenario-card").first()).toBeVisible();
});

test("native pause stops an active voice player even while document visibility remains visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const paused = new WeakMap<HTMLMediaElement, boolean>();
    Object.defineProperty(HTMLMediaElement.prototype, "paused", {
      configurable: true,
      get(this: HTMLMediaElement) {
        return paused.get(this) ?? true;
      },
    });
    HTMLMediaElement.prototype.play = async function (this: HTMLMediaElement) {
      paused.set(this, false);
      this.dispatchEvent(new Event("play"));
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      paused.set(this, true);
      this.dispatchEvent(new Event("pause"));
    };
    HTMLMediaElement.prototype.load = function (this: HTMLMediaElement) {
      paused.set(this, true);
    };
  });
  const { dialog } = await openCall(page);
  const audio = dialog.locator("audio");
  await dialog
    .getByRole("button", { name: "Слушать реплику", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeVisible();
  expect(await audio.evaluate((media: HTMLAudioElement) => media.paused)).toBe(
    false,
  );
  await suspend(page);
  await expect
    .poll(() => audio.evaluate((media: HTMLAudioElement) => media.paused))
    .toBe(true);
  await expect(
    dialog.getByRole("button", { name: "Слушать реплику", exact: true }),
  ).toBeVisible();
});

test("native pause releases an active camera without relying on visibilitychange", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { starts: 0, stops: 0 };
    Object.defineProperty(window, "nativeCamera", { value: state });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          state.starts++;
          return { getTracks: () => [{ stop: () => state.stops++ }] };
        },
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return null;
      },
      set() {},
    });
    HTMLMediaElement.prototype.play = async () => {};
  });
  await page.goto("/");
  await navigate(page, "Проверить ссылку или QR-код");
  await page
    .getByRole("button", { name: "Сканировать камерой", exact: true })
    .click();
  await expect(page.locator("video")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as Window & {
            nativeCamera: { starts: number; stops: number };
          }
        ).nativeCamera,
    ),
  ).toEqual({ starts: 1, stops: 0 });
  await suspend(page);
  await expect(page.locator("video")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as Window & { nativeCamera: { stops: number } })
          .nativeCamera.stops,
    ),
  ).toBe(1);
  await expect(
    page.getByRole("button", { name: "Сканировать камерой", exact: true }),
  ).toBeEnabled();
});

test("native pause cancels online checking and a late response cannot replace a fresh result", async ({
  page,
}) => {
  let count = 0;
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let finish = () => {};
  const completed = new Promise<void>((resolve) => {
    finish = resolve;
  });
  async function respond(route: Route, dangerous: boolean) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        verdict: dangerous ? "dangerous" : "no_known_threats",
        provider: "google-safe-browsing",
        checkedAt: new Date().toISOString(),
        threatTypes: dangerous ? ["SOCIAL_ENGINEERING"] : [],
        scope: "submitted-url-only",
        redirectsChecked: false,
      }),
    });
  }
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await respond(route, false);
      return;
    }
    count++;
    if (count === 1) {
      await held;
      await respond(route, true).catch(() => {});
      finish();
    } else await respond(route, false);
  });
  await page.goto("/");
  await navigate(page, "Проверить ссылку или QR-код");
  const input = page.getByRole("textbox", { name: "Ссылка для проверки" });
  await input.fill("https://example.com/first");
  await page
    .getByRole("button", { name: "Проверить онлайн", exact: true })
    .click();
  await expect.poll(() => count).toBe(1);
  await expect(page.getByTestId("link-online-result")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await suspend(page);
  await expect(page.getByTestId("link-online-result")).toHaveCount(0);
  await expect(input).toHaveValue("https://example.com/first");
  await expect(
    page.getByRole("button", { name: "Проверить онлайн", exact: true }),
  ).toBeEnabled();
  await input.fill("https://example.com/fresh");
  await page
    .getByRole("button", { name: "Проверить онлайн", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Угроз не обнаружено", exact: true }),
  ).toBeVisible();
  release();
  await completed;
  await expect(
    page.getByRole("heading", { name: "Угроз не обнаружено", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ссылка может быть опасной",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(count).toBe(2);
});
