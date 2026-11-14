import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { scenarios } from "../src/content/scenarios";
import { storyEndpoint } from "../src/story-submission";

const sample =
  "В мессенджере знакомый попросил одолжить деньги. Он торопил и отказывался говорить по телефону. Я набрал сохранённый номер и выяснил, что настоящий знакомый ничего не просил. Перевода не было.";
async function openStory(page: Page, id: string) {
  const s = scenarios.find((s) => s.id === id)!;
  await page.getByRole("textbox", { name: "Поиск ситуаций" }).fill(s.title);
  await page
    .locator(".scenario-card")
    .filter({ has: page.getByRole("heading", { name: s.title, exact: true }) })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
}
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, why: n.failureSummary })),
    })),
  ).toEqual([]);
}
test("two payments are clearly errors, and each names the action and a safer alternative", async ({
  page,
}) => {
  await page.goto("/");
  await openStory(page, "call-secret-operation");
  for (const index of [1, 0, 2, 1])
    await page.locator(".choices>button").nth(index).click();
  await expect(page.locator(".outcome-status.danger")).toContainText(
    "Допущена серьёзная ошибка",
  );
  await expect(page.locator(".outcome-status.danger")).toBeInViewport();
  await expect(
    page.getByRole("heading", { name: "Где вы ошиблись: 2" }),
  ).toBeVisible();
  await expect(page.locator(".mistake-review>ol>li")).toHaveCount(2);
  await expect(page.locator(".error-step").first()).toContainText("шаг 3");
  await expect(page.locator(".error-step").last()).toContainText("шаг 4");
  await expect(page.locator(".consequence-summary")).toContainText(
    "Повторный платёж",
  );
  await expect(page.locator(".better-action")).toHaveCount(2);
  await expect(page.locator(".recovery-actions")).toContainText(
    "свяжитесь с банком",
  );
});
test("stopping after paying still shows the mistake and retained loss", async ({
  page,
}) => {
  await page.goto("/");
  await openStory(page, "call-secret-operation");
  await page.locator(".choices>button").nth(2).click();
  await page.locator(".choices>button").first().click();
  await expect(page.locator(".outcome-status.danger")).toContainText(
    "Проверьте последствия",
  );
  await expect(page.locator(".consequence-summary")).toContainText(
    "уже отправлена",
  );
});
test("theme and unified low-vision mode survive reload; base sizes are larger", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    ),
  ).toBeGreaterThanOrEqual(20);
  expect(
    await page
      .locator(".card-body>p")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(15);
  await page.getByRole("switch", { name: "Тёмная тема", exact: true }).click();
  await page.getByRole("button", { name: "О приложении и настройках" }).click();
  await page.getByLabel("Версия для слабовидящих", { exact: false }).check();
  await expect(page.getByLabel("Крупный текст", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Повышенный контраст", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-low-vision", "true");
  expect(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    ),
  ).toBeGreaterThanOrEqual(24);
  await page.getByRole("switch", { name: "Тёмная тема", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("low-vision text and selected controls exceed 7:1 in both palettes", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "cybershield-preferences-v1",
      JSON.stringify({ theme: "light", lowVision: true }),
    ),
  );
  await page.goto("/");
  for (let mode = 0; mode < 2; mode++) {
    const ratios = await page
      .locator(".card-body>p,.hero .primary,.nav-button.selected")
      .evaluateAll((elements) =>
        elements.slice(0, 8).map((element) => {
          const s = getComputedStyle(element);
          const lum = (color: string) => {
            const rgb = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              });
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          const a = lum(s.color),
            b = lum(s.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        }),
      );
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(7);
    await page
      .getByRole("switch", { name: "Тёмная тема", exact: true })
      .click();
  }
});
test("200 percent browser-equivalent layout and custom text spacing retain the controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/");
  await page.addStyleTag({
    content:
      ".app * {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;} .app p {margin-bottom:2em!important;}",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(640);
  await page.getByRole("button", { name: "Ваша история", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ваша история", exact: true })
    .fill(sample);
  await page
    .getByRole("button", { name: "Проверить историю", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Подтверждаю/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(640);
});

for (const theme of ["light", "dark"] as const)
  for (const lowVision of [false, true]) {
    const name = `${theme}, lowVision=${lowVision}`;
    test(`readable modes and form accessibility: ${name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (p) =>
          localStorage.setItem("cybershield-preferences-v1", JSON.stringify(p)),
        { theme, lowVision },
      );
      await page.goto("/");
      await audit(page);
      await page
        .getByRole("button", { name: "Ваша история", exact: true })
        .click();
      await audit(page);
      await page
        .getByRole("textbox", { name: "Ваша история", exact: true })
        .fill(sample);
      await page
        .getByRole("button", { name: "Проверить историю", exact: true })
        .click();
      await audit(page);
      await page
        .getByRole("button", { name: "О приложении и настройках" })
        .click();
      await audit(page);
      await page.getByRole("button", { name: "Готово", exact: true }).click();
      await page.getByRole("button", { name: "Практика", exact: true }).click();
      await openStory(page, "call-secret-operation");
      await page.locator(".choices>button").nth(2).click();
      await page.locator(".choices>button").nth(1).click();
      await audit(page);
    });
    for (const channel of [
      "sms",
      "viber",
      "telegram",
      "whatsapp",
      "call",
      "email",
      "web",
      "instagram",
    ]) {
      test(`scene accessible in ${name}: ${channel}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(
          (p) =>
            localStorage.setItem(
              "cybershield-preferences-v1",
              JSON.stringify(p),
            ),
          { theme, lowVision },
        );
        await page.goto("/");
        await openStory(page, scenarios.find((s) => s.channel === channel)!.id);
        await audit(page);
      });
    }
    for (const width of [320, 390, 768, 900, 1125])
      test(`reflow ${width}px ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          (p) =>
            localStorage.setItem(
              "cybershield-preferences-v1",
              JSON.stringify(p),
            ),
          { theme, lowVision },
        );
        await page.goto("/");
        const fits = async () => {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width);
          expect(
            await page
              .locator("dialog[open]")
              .evaluateAll((dialogs) =>
                dialogs.every((d) => d.scrollWidth <= d.clientWidth + 1),
              ),
          ).toBe(true);
        };
        await fits();
        await page
          .getByRole("button", { name: "Ваша история", exact: true })
          .click();
        await fits();
        await page
          .getByRole("button", { name: "Практика", exact: true })
          .click();
        await openStory(page, "call-secret-operation");
        await fits();
        await page.locator(".choices>button").nth(2).click();
        await page.locator(".choices>button").nth(1).click();
        await fits();
      });
  }

test("story preview, explicit consent and real transport contract without storing the story", async ({
  page,
}) => {
  let sent = 0;
  await page.route(storyEndpoint, async (route) => {
    sent++;
    const data = route.request().postDataJSON();
    expect(data["История"]).toBe(sample);
    expect(data.email).toBeUndefined();
    expect(data.name).toBeUndefined();
    await route.fulfill({
      json: { success: "true", message: "Form successfully submitted" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ваша история", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Только история. Без персональных данных.",
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ваша история", exact: true })
    .fill(sample);
  await page
    .getByRole("button", { name: "Проверить историю", exact: true })
    .click();
  expect(sent).toBe(0);
  await expect(
    page.getByRole("button", { name: "Отправить историю", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /Подтверждаю/ }).check();
  await page
    .getByRole("button", { name: "Отправить историю", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "История передана в обработку" }),
  ).toBeVisible();
  expect(sent).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    sample,
  );
});
for (const mode of ["failure", "activation"]) {
  test(`story delivery ${mode} is never shown as completed`, async ({
    page,
  }) => {
    await page.route(storyEndpoint, (route) =>
      mode === "failure"
        ? route.fulfill({ status: 503, body: "Unavailable" })
        : route.fulfill({
            json: {
              success: false,
              message: "Please activate your form by confirming your email",
            },
          }),
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Ваша история", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Ваша история", exact: true })
      .fill(sample);
    await page
      .getByRole("button", { name: "Проверить историю", exact: true })
      .click();
    await page.getByRole("checkbox", { name: /Подтверждаю/ }).check();
    await page
      .getByRole("button", { name: "Отправить историю", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator(".story-preview")).toContainText(sample);
    await expect(
      page.getByRole("heading", { name: "История передана в обработку" }),
    ).toHaveCount(0);
  });
}
test("contacts in the story are flagged before any request", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ваша история", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ваша история", exact: true })
    .fill(sample + " Напишите на name@example.com.");
  await page
    .getByRole("button", { name: "Проверить историю", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("почты");
  await expect(page.locator(".story-review")).toHaveCount(0);
});
