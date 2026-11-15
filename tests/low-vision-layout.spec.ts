import { test, expect, type Page } from "@playwright/test";
import { scenarios } from "../src/content/scenarios";
async function assertButtonsFit(page: Page, selector: string) {
  const violations = await page.locator(selector).evaluateAll((buttons) =>
    buttons.flatMap((button) => {
      const r = button.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return [];
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      const problems: string[] = [];
      while ((node = walker.nextNode())) {
        if (
          !node.textContent?.trim() ||
          parseFloat(getComputedStyle(node.parentElement!).fontSize) === 0
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const box of range.getClientRects())
          if (
            box.width > 0 &&
            (box.right > r.right + 2 ||
              box.left < r.left - 2 ||
              box.bottom > r.bottom + 2 ||
              box.top < r.top - 2)
          )
            problems.push((node.textContent || "").trim().slice(0, 90));
      }
      return problems.length
        ? [{ label: button.textContent?.trim().slice(0, 100), problems }]
        : [];
    }),
  );
  expect(violations).toEqual([]);
}
test("low-vision logo stays on one line and settings text stays inside its frame at desktop widths", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "cybershield-preferences-v1",
      JSON.stringify({ theme: "light", lowVision: true }),
    ),
  );
  for (const width of [900, 1125, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const box = await page
      .locator(".desktop-sidebar .brand-name")
      .evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const side = el.closest("aside")!.getBoundingClientRect();
        return {
          lines: range.getClientRects().length,
          right: range.getBoundingClientRect().right,
          limit: side.right,
        };
      });
    expect(box.lines).toBe(1);
    expect(box.right).toBeLessThanOrEqual(box.limit);
    await assertButtonsFit(page, ".desktop-sidebar button");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
for (const width of [320, 390, 768])
  for (const theme of ["light", "dark"])
    test(`all new controls fit low-vision mode at ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (p) =>
          localStorage.setItem("cybershield-preferences-v1", JSON.stringify(p)),
        { theme, lowVision: true },
      );
      await page.goto("/");
      await page
        .getByRole("button", { name: "О приложении и настройках" })
        .click();
      await assertButtonsFit(page, "dialog[open] button,dialog[open] label");
      expect(
        await page
          .locator("dialog[open]")
          .evaluate((d) => d.scrollWidth <= d.clientWidth + 1),
      ).toBe(true);
      await page.getByRole("button", { name: "Готово", exact: true }).click();
      for (const name of [
        "Мне нужна помощь",
        "Проверить сообщение",
        "Диагностика",
        "Мой план",
        "Для занятий",
        "Источники",
      ]) {
        let button = page.getByRole("button", { name, exact: true });
        if (!(await button.count())) {
          await page
            .getByRole("button", { name: "Все разделы", exact: true })
            .click();
          button = page
            .getByRole("dialog", { name: "Все разделы", exact: true })
            .getByRole("button", { name, exact: true });
        }
        await button.click();
        await expect(page.locator(".feature-page h1")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await assertButtonsFit(
          page,
          ".feature-page button,.mobile-navigation button",
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    });
for (const s of scenarios)
  test(`low-vision readable controls: ${s.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem(
        "cybershield-preferences-v1",
        JSON.stringify({ theme: "light", lowVision: true }),
      ),
    );
    await page.goto("/");
    await page.getByRole("textbox", { name: "Поиск ситуаций" }).fill(s.title);
    await page
      .locator(".scenario-card")
      .filter({
        has: page.getByRole("heading", { name: s.title, exact: true }),
      })
      .click();
    await page.evaluate(() => document.fonts.ready);
    await assertButtonsFit(page, ".simulation-dialog button");
    await page
      .getByRole("button", { name: "Начать ситуацию", exact: true })
      .click();
    let node = s.start;
    while (!s.endings[node]) {
      await assertButtonsFit(page, ".simulation-dialog button");
      await page.locator(".choices>button").first().click();
      node = s.nodes[node].choices[0].next;
    }
    await assertButtonsFit(page, ".simulation-dialog button");
    expect(
      await page
        .locator("dialog[open]")
        .evaluate((d) => d.scrollWidth <= d.clientWidth + 1),
    ).toBe(true);
  });
