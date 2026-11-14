import { test, expect } from "@playwright/test";
import { collections } from "../src/content/collections";
import { scenarios } from "../src/content/scenarios";
test("credit application may be abandoned before signing; new voice is locally playable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Встречный кредит отменит чужой/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute(
    "src",
    "/audio/call-mirror-credit-start.mp3",
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
  await page.getByRole("button", { name: /Открою встречную заявку/ }).click();
  await expect(
    page.getByText("Вы открыли обычную заявку.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  const evidence = page.locator(".call-scene .evidence-card");
  await evidence.locator("summary").click();
  await expect(
    evidence.getByText("Кредитный договор", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "После вашего решения", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Не подпишу и сначала проверю/ })
    .click();
  await page
    .getByRole("button", { name: /Сохраню сведения о звонке и не оформлю/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Проверка не создала новый долг",
      exact: true,
    }),
  ).toBeVisible();
});
test("cash is still owned at the meeting and an explicit handover is retained in the debrief", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /Наличные заберут для проверки/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page.getByRole("button", { name: /Соглашусь на встречу/ }).click();
  await expect(
    page.getByText("Пакет пока у вас.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Передам наличные после показа/ })
    .click();
  await page
    .getByRole("button", { name: /Не передам больше, сохраню обстоятельства/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Вы остановили продолжение после передачи пакета",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "Наличные уже переданы",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
test("charity check distinguishes recipient consent from publishing private documents to expose fraud", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Можно открыть сбор прямо сейчас/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Уточню, кто вправе представлять получателя/ })
    .click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(
    evidence.getByText("Не подтверждено", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Не буду публиковать до проверки/ })
    .click();
  await page
    .getByRole("button", { name: /Выложу документы в общий чат/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Проверка выявила подмену, но документы раскрыты",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "отдельный ущерб",
  );
});
test("genuine business request does not imply guaranteed loan repayment", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Одолжишь на развитие дела/ }).click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Сначала подтвержу личность другим каналом/ })
    .click();
  await expect(page.locator(".choices>button")).toHaveCount(3);
  await page
    .getByRole("button", { name: /Обсужу ограниченную посильную сумму/ })
    .click();
  await expect(
    page.getByText("В этой истории обращение было настоящим.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "возврат денег не гарантирован",
  );
});
test("unsolicited crypto support does not actually request screen capture and shared-screen consequences remain", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Поддержка увидела вашу жалобу/ })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Сразу покажу экран с открытым кошельком/ })
    .click();
  await page
    .getByRole("button", { name: /Прекращу демонстрацию и проверю доступы/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Вы занялись раскрытием после демонстрации",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "Экран уже был показан",
  );
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cybershield-progress-v1") || "[]"),
  );
  expect(progress.at(-1).outcome).toBe("caution");
});
test("fifth collection completes ten actual stories and explains incorrect optional quiz answers", async ({
  page,
}) => {
  test.setTimeout(120000);
  const c = collections.find((c) => c.id === "documents-and-authority")!;
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
    .getByRole("button", { name: "Да, пройти квиз", exact: true })
    .click();
  for (const [i, q] of c.quiz.entries()) {
    await page
      .getByRole("radio", { name: q.options[0].text, exact: true })
      .check();
    await page
      .getByRole("button", {
        name: i === 2 ? "Закончить квиз" : "Следующий вопрос",
        exact: true,
      })
      .click();
  }
  const correct = c.quiz.filter((q) => q.options[0].id === q.correctId).length;
  await expect(
    page.getByRole("heading", { name: `Ответы: ${correct} из 3`, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".quiz-review article")).toHaveCount(3);
  await expect(
    page.getByText("Подходящий ответ:", { exact: false }),
  ).toHaveCount(3 - correct);
});
