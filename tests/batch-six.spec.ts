import { test, expect } from "@playwright/test";
import { collections } from "../src/content/collections";
import { scenarios } from "../src/content/scenarios";
test("Instagram context and booking evidence work on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Instagram", exact: true }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => s.channel === "instagram").length,
  );
  await page.getByRole("button", { name: /Дом с купелью уже ждёт/ }).click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await expect(page.locator(".chat-device.instagram")).toBeVisible();
  await page
    .getByRole("button", { name: /Уточню адрес, условия отмены/ })
    .click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(
    evidence.getByText("Только после оплаты", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Не буду платить без проверяемого объекта/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Отдых можно выбрать по проверяемым условиям",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
test("a partially paid car keeps the unsettled payment after handover", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Часть пришла, остальное на скриншоте/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Уточню, почему пришла только часть/ })
    .click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(
    evidence.getByText("Условно 8 000 BYN", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Передам машину под обещание/ })
    .click();
  await page
    .getByRole("button", { name: /Сохраню сведения о передаче и оплате/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Вы занялись недоплатой после передачи",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "Автомобиль уже передан",
  );
});
test("new medical call plays local audio and stopping after payment preserves the loss", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Курс лечения только сегодня/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute(
    "src",
    "/audio/call-wonder-cure-start.mp3",
  );
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Слушать реплику", exact: true })
    .click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: /Сразу закажу, пока есть скидка/ })
    .click();
  await expect(page.locator("audio")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Остановлю покупки, сохраню документы/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Новые расходы остановлены после покупки",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "не вернулась автоматически",
  );
});
test("fourth collection passes all ten stories and permits summary without quiz", async ({
  page,
}) => {
  test.setTimeout(120000);
  const c = collections.find((c) => c.id === "check-good-deals")!;
  await page.goto("/");
  await page.getByRole("button", { name: "Подборки", exact: true }).click();
  await page
    .locator(".learning-card")
    .filter({ has: page.getByRole("heading", { name: c.title, exact: true }) })
    .getByRole("button")
    .click();
  await page
    .getByRole("button", { name: "Начать подборку", exact: true })
    .click();
  for (const [i, id] of c.scenarioIds.entries()) {
    const s = scenarios.find((s) => s.id === id)!;
    const dialog = page.locator(".simulation-dialog");
    await dialog
      .getByRole("button", { name: "Начать ситуацию", exact: true })
      .click();
    let node = s.start;
    while (!s.endings[node]) {
      const choice = s.nodes[node].choices[0];
      await dialog.locator(".choices>button").first().click();
      node = choice.next;
    }
    await expect(
      dialog.getByRole("heading", { name: s.endings[node].title, exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("button", {
        name: i === 9 ? "К итогу подборки" : "Следующая история",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Общий урок подборки", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Нет, перейти к итогу", exact: true })
    .click();
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  const run = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cybershield-collections-v1") || "{}")[
        "check-good-deals"
      ],
  );
  expect(run.results).toHaveLength(10);
  expect(run.quiz.status).toBe("declined");
});
