import { test, expect, type Page } from "@playwright/test";
import { collections } from "../src/content/collections";
import { scenarios } from "../src/content/scenarios";
import {
  freshRun,
  recordResult,
  type CollectionResult,
} from "../src/collection-engine";
async function openCollection(page: Page, index = 0) {
  await page.getByRole("button", { name: "Подборки", exact: true }).click();
  const card = page.locator(".learning-card").filter({
    has: page.getByRole("heading", {
      name: collections[index].title,
      exact: true,
    }),
  });
  await card.getByRole("button").click();
}
async function completeRoute(page: Page, collectionIndex = 0) {
  const c = collections[collectionIndex];
  await openCollection(page, collectionIndex);
  await page
    .getByRole("button", { name: "Начать подборку", exact: true })
    .click();
  for (const [index, id] of c.scenarioIds.entries()) {
    const s = scenarios.find((s) => s.id === id)!;
    const dialog = page.locator(".simulation-dialog");
    await dialog
      .getByRole("button", { name: "Начать ситуацию", exact: true })
      .click();
    let node = s.start;
    while (!s.endings[node]) {
      const choice = s.nodes[node].choices[0];
      await dialog.locator(".choices>button").nth(0).click();
      node = choice.next;
    }
    await expect(
      dialog.getByRole("heading", { name: s.endings[node].title, exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("button", {
        name:
          index === c.scenarioIds.length - 1
            ? "К итогу подборки"
            : "Следующая история",
        exact: true,
      })
      .click();
  }
}
test("benefits and obligations collection completes all ten stories and leaves the quiz optional", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await completeRoute(page, 5);
  await expect(
    page.getByRole("heading", { name: "Что объединяет эти ситуации" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Нет, перейти к итогу", exact: true })
    .click();
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  await expect(page.locator(".quiz-question")).toHaveCount(0);
});
test("ten real scenarios finish a route and quiz can be declined without losing the summary", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await completeRoute(page);
  await expect(
    page.getByRole("heading", { name: "Что объединяет эти ситуации" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Нет, перейти к итогу", exact: true })
    .click();
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  await expect(page.locator(".quiz-question")).toHaveCount(0);
  await page.reload();
  await openCollection(page);
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  const raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cybershield-collections-v1") || "{}"),
  );
  expect(raw["pause-and-check"].results).toHaveLength(10);
  expect(raw["pause-and-check"].quiz.status).toBe("declined");
});
test("optional quiz resumes, may be stopped midway, and then gives explanations for all submitted answers", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await completeRoute(page);
  await page
    .getByRole("button", { name: "Да, пройти квиз", exact: true })
    .click();
  const c = collections[0];
  await page
    .getByRole("radio", {
      name: c.quiz[0].options.find((o) => o.id === c.quiz[0].correctId)!.text,
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Следующий вопрос", exact: true })
    .click();
  await page.reload();
  await openCollection(page);
  await expect(
    page.getByRole("group", { name: c.quiz[1].text, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Завершить без квиза", exact: true })
    .click();
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Всё-таки пройти квиз", exact: true })
    .click();
  for (const [i, q] of c.quiz.entries()) {
    await page
      .getByRole("radio", {
        name: q.options.find((o) => o.id === q.correctId)!.text,
        exact: true,
      })
      .check();
    await page
      .getByRole("button", {
        name: i === c.quiz.length - 1 ? "Закончить квиз" : "Следующий вопрос",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ответы: 3 из 3", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".quiz-review article")).toHaveCount(3);
});
test("pause, reload and standalone practice do not skip or complete a collection story", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await openCollection(page);
  await page
    .getByRole("button", { name: "Начать подборку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Мне некомфортно", exact: true })
    .click();
  await page
    .getByRole("button", { name: "К маршруту подборки", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Попробовать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Позвоню тебе по сохранённому номеру/ })
    .click();
  await page.getByRole("button", { name: /Выйду из чата и всё равно/ }).click();
  await page.getByRole("button", { name: "К ситуациям", exact: true }).click();
  await openCollection(page);
  await expect(
    page.getByRole("heading", {
      name: "Следующая история: 1 из 10",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
test("replaying a story inside a route replaces its previous result before continuing", async ({
  page,
}) => {
  await page.goto("/");
  await openCollection(page);
  await page
    .getByRole("button", { name: "Начать подборку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Конечно, присылай реквизиты/ })
    .click();
  await page
    .getByRole("button", { name: /Для начала отправлю небольшую сумму/ })
    .click();
  await page
    .getByRole("button", { name: "Попробовать другой путь", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Позвоню тебе по сохранённому номеру/ })
    .click();
  await page.getByRole("button", { name: /Выйду из чата и всё равно/ }).click();
  await page
    .getByRole("button", { name: "Следующая история", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "«Есть минутка помочь?»", exact: true }),
  ).toBeVisible();
  const run = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cybershield-collections-v1") || "{}")[
        "pause-and-check"
      ],
  );
  expect(run.results).toHaveLength(1);
  expect(run.results[0].outcome).toBe("safe");
  expect(run.results[0].counts.risk).toBe(0);
});
function firstResult(id: string): CollectionResult {
  const s = scenarios.find((s) => s.id === id)!;
  const counts = { safe: 0, caution: 0, risk: 0 };
  let node = s.start;
  while (!s.endings[node]) {
    const c = s.nodes[node].choices[0];
    counts[c.assessment]++;
    node = c.next;
  }
  return {
    scenarioId: id,
    endingId: node,
    outcome: s.endings[node].outcome,
    counts,
  };
}
test("a seeded valid in-progress quiz has no answer preselected and does not force completion on mobile", async ({
  page,
}) => {
  const c = collections[1];
  const run = c.scenarioIds.reduce(
    (r, id) => recordResult(c, r, firstResult(id)),
    freshRun(c),
  );
  run.quiz = { status: "in-progress", answers: {} };
  await page.addInitScript(
    ({ id, run }) =>
      localStorage.setItem(
        "cybershield-collections-v1",
        JSON.stringify({ [id]: run }),
      ),
    { id: c.id, run },
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await openCollection(page, 1);
  await expect(
    page.getByRole("button", { name: "Следующий вопрос", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Завершить без квиза", exact: true })
    .click();
  await expect(
    page.getByText("Подборка завершена. Вы выбрали итог без квиза."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
test("new call uses packaged ElevenLabs audio and audience guidance is shown for each story", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Нашли неучтённый стаж/ }).click();
  await expect(
    page.getByText("Получателям пенсии и их близким", { exact: true }).last(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("src", "/audio/call-pension-start.mp3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Слушать реплику", exact: true })
    .click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
});
