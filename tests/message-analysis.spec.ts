import { test, expect } from "@playwright/test";
import fs from "node:fs";
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
for (const locale of ["ru", "en", "be"] as const)
  for (const width of [320, 1440])
    test(`${locale}: discontinued message checker is absent at ${width}px`, async ({
      page,
    }) => {
      const catalog = JSON.parse(
        fs.readFileSync(`src/i18n/catalogs/${locale}.json`, "utf8"),
      );
      const text = (source: string) =>
        locale === "ru" ? source : catalog.messages[source];
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?lang=${locale}`);
      await expect(
        page.getByRole("button", {
          name: text("Проверить сообщение"),
          exact: true,
        }),
      ).toHaveCount(0);
      if (width === 320)
        await page
          .getByRole("button", { name: text("Все разделы"), exact: true })
          .click();
      await expect(
        page.getByRole("button", {
          name: text("Проверить сообщение"),
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page
          .getByRole("button", {
            name: text("Проверить ссылку или QR-код"),
            exact: true,
          })
          .first(),
      ).toBeVisible();
    });
