import { test, expect } from "@playwright/test";
import { scenarios } from "../src/content/scenarios";

for (const s of scenarios) {
  test(`catalog: ${s.id} opens, responds, explains and retries`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("textbox", { name: "Поиск ситуаций" }).fill(s.title);
    const card = page
      .locator(".scenario-card")
      .filter({
        has: page.getByRole("heading", { name: s.title, exact: true }),
      });
    await card.click();
    const dialog = page.locator(".simulation-dialog");
    await dialog
      .getByRole("button", { name: "Начать ситуацию", exact: true })
      .click();
    let node = s.start;
    let steps = 0;
    while (!s.endings[node]) {
      await expect(dialog.locator(".choices>button")).toHaveCount(
        s.nodes[node].choices.length,
      );
      await dialog.locator(".choices>button").first().click();
      node = s.nodes[node].choices[0].next;
      steps++;
    }
    await expect(
      dialog.getByRole("heading", { name: s.endings[node].title, exact: true }),
    ).toBeVisible();
    await expect(dialog.locator(".decision-list li")).toHaveCount(steps);
    await expect(dialog.locator(".lesson-box li")).toHaveCount(
      s.lessons.length,
    );
    await dialog
      .getByRole("button", { name: "Попробовать другой путь", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Начать ситуацию", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
