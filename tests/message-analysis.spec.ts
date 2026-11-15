import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { suspiciousMessages } from "./fixtures/message-corpus";
test("resource cards only show organization, title and explanation, with no dates or links", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Источники", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Источники и методика", exact: true }),
  ).toBeVisible();
  const list = page.locator(".reference-list");
  await expect(list.locator("article")).toHaveCount(15);
  await expect(list.locator("a")).toHaveCount(0);
  await expect(list).not.toContainText(
    /Белпочта|Е-Паслуга|НЦЭУ|Попытка доступа|Проверка:|2026-11/,
  );
  await expect(list).toContainText("W3C / WAI");
  await expect(list).toContainText("Пользовательские интервалы");
  await expect(list).toContainText("Альфа Банк Беларусь");
});
test("subtle source-derived examples warn, explain text, and never fetch or persist its contents", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(r.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Проверить сообщение", exact: true })
    .first()
    .click();
  const field = page.getByRole("textbox", {
    name: "Обезличенный текст сообщения",
  });
  for (const i of [
    0, 5, 10, 11, 14, 15, 24, 28, 30, 34, 36, 38, 43, 47, 54, 62, 74,
  ]) {
    const sample = suspiciousMessages[i];
    await field.fill(sample.text);
    await page.getByRole("button", { name: "Проверить", exact: true }).click();
    const result = page.getByRole("region", { name: "Результат анализа" });
    await expect(result.locator(".analysis-signal")).not.toHaveCount(0);
    await expect(result.locator(".analysis-excerpt").first()).toContainText(
      "Фрагмент сообщения",
    );
    await expect(result).not.toContainText("Типовые признаки не найдены");
    const store = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    );
    expect(store).not.toContain(sample.text);
  }
  await field.fill(
    '<img src="https://example.invalid/probe" onerror="alert(1)"> Скинь код из смс.',
  );
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(".analysis-result img")).toHaveCount(0);
  await expect(page.locator(".analysis-excerpt").first()).toContainText("<img");
  expect(external).toEqual([]);
  await page
    .getByRole("button", { name: "Перейти в помощь", exact: true })
    .click();
  await expect(page.locator("body")).not.toContainText("example.invalid/probe");
});
for (const theme of ["light", "dark"])
  for (const lowVision of [false, true])
    test(`warning results stay readable and accessible: ${theme}, lowVision=${lowVision}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(
        (p) =>
          localStorage.setItem("cybershield-preferences-v1", JSON.stringify(p)),
        { theme, lowVision },
      );
      await page.goto("/");
      await page
        .getByRole("button", { name: "Все разделы", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Все разделы" })
        .getByRole("button", { name: "Проверить сообщение", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Обезличенный текст сообщения" })
        .fill("Срочно! Проголосуй за племянницу по QR. Скинь код из смс.");
      await page
        .getByRole("button", { name: "Проверить", exact: true })
        .click();
      await expect(page.locator(".analysis-combinations")).toBeVisible();
      const banner = await page.locator(".analysis-summary").boundingBox();
      expect(banner!.y).toBeGreaterThanOrEqual(-1);
      expect(banner!.y).toBeLessThan(80);
      await expect(page.locator(".analysis-result")).toContainText(
        "Опасный признак",
      );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.failureSummary),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
    });
