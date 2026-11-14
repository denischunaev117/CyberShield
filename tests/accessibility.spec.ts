import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { scenarios } from "../src/content/scenarios";
import { collections } from "../src/content/collections";
import { freshRun, recordResult } from "../src/collection-engine";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        reason: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
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
  test(`accessible active scene: ${channel}`, async ({ page }) => {
    const s = scenarios.find((s) => s.channel === channel)!;
    await page.goto("/");
    await page.getByRole("textbox", { name: "Поиск ситуаций" }).fill(s.title);
    await page
      .locator(".scenario-card")
      .filter({
        has: page.getByRole("heading", { name: s.title, exact: true }),
      })
      .click();
    await page
      .getByRole("button", { name: "Начать ситуацию", exact: true })
      .click();
    await audit(page);
  });
}
test("collection summary, optional quiz and quiz review are accessible", async ({
  page,
}) => {
  const c = collections.at(-1)!;
  let run = freshRun(c);
  for (const id of c.scenarioIds) {
    const s = scenarios.find((s) => s.id === id)!;
    let node = s.start;
    const counts = { safe: 0, caution: 0, risk: 0 };
    while (!s.endings[node]) {
      const choice = s.nodes[node].choices[0];
      counts[choice.assessment]++;
      node = choice.next;
    }
    run = recordResult(c, run, {
      scenarioId: id,
      endingId: node,
      outcome: s.endings[node].outcome,
      counts,
    });
  }
  await page.addInitScript(
    ({ id, run }) =>
      localStorage.setItem(
        "cybershield-collections-v1",
        JSON.stringify({ [id]: run }),
      ),
    { id: c.id, run },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Подборки", exact: true }).click();
  await page.locator(".learning-card").last().getByRole("button").click();
  await audit(page);
  await page
    .getByRole("button", { name: "Да, пройти квиз", exact: true })
    .click();
  for (const [index, q] of c.quiz.entries()) {
    await audit(page);
    await page
      .getByRole("radio", { name: q.options[0].text, exact: true })
      .check();
    await page
      .getByRole("button", {
        name:
          index === c.quiz.length - 1 ? "Закончить квиз" : "Следующий вопрос",
        exact: true,
      })
      .click();
  }
  await audit(page);
});
test("catalog, active simulation and debrief meet automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await audit(page);
  await page.getByRole("button", { name: "Попробовать ситуацию" }).click();
  await audit(page);
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await audit(page);
  await page.locator(".choices>button").first().click();
  await page.locator(".choices>button").first().click();
  await audit(page);
});
test("collections and phone layout remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Подборки", exact: true }).click();
  await audit(page);
  await page.locator(".learning-card").last().getByRole("button").click();
  await audit(page);
});
for (const width of [320, 390, 768, 1440]) {
  test(`responsive screens at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const noOverflow = async () =>
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    await noOverflow();
    await page.getByRole("button", { name: "Попробовать ситуацию" }).click();
    await noOverflow();
    await page.getByRole("button", { name: "Начать ситуацию" }).click();
    await noOverflow();
    await expect(
      page.getByRole("button", { name: "Мне некомфортно", exact: true }),
    ).toBeInViewport();
  });
}
