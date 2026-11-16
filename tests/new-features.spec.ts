import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import jsQR from "jsqr";
import { diagnosticQuestions } from "../src/content/diagnostic-questions";
import { classroomLessons } from "../src/content/classroom-lessons";
import { scenarios } from "../src/content/scenarios";
import {
  newDiagnostic,
  answerDiagnostic,
  initialForm,
  finalForm,
  formQuestions,
  startPost,
  type DiagnosticRun,
} from "../src/features/diagnostics/engine";
import {
  newLessonRun,
  recordLessonResult,
  answerLesson,
  lessonReport,
} from "../src/features/classroom/engine";
async function go(page: Page, name: string) {
  let button = page
    .locator(".desktop-sidebar")
    .getByRole("button", { name, exact: true });
  if (!(await button.count())) {
    await page
      .getByRole("button", { name: "Все разделы", exact: true })
      .click();
    button = page
      .getByRole("dialog", { name: "Все разделы", exact: true })
      .getByRole("button", { name, exact: true });
  }
  await button.click();
}
async function answerForm(page: Page, points: 0 | 2) {
  for (let i = 0; i < 12; i++) {
    const text = await page
      .locator(".diagnostic-question legend")
      .textContent();
    const q = diagnosticQuestions.find((q) => q.prompt === text)!;
    await page
      .getByRole("radio", {
        name: q.options.find((o) => o.points === points)!.text,
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Подтвердить ответ", exact: true })
      .click();
  }
}
async function finishStory(page: Page, id: string) {
  const s = scenarios.find((s) => s.id === id)!;
  const dialog = page.locator(".simulation-dialog");
  await dialog
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  let node = s.start;
  while (!s.endings[node]) {
    await dialog.locator(".choices>button").first().click();
    node = s.nodes[node].choices[0].next;
  }
  await expect(
    dialog.getByRole("heading", { name: s.endings[node].title, exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Закрыть сценарий", exact: true })
    .click();
}
function seededDiagnostic() {
  let r: DiagnosticRun = newDiagnostic(1, "12345678-abcd");
  for (const q of formQuestions(initialForm(r)))
    r = answerDiagnostic(r, q.id, q.options.find((o) => o.points === 2)!.id);
  r = startPost(r);
  for (const q of formQuestions(finalForm(r)))
    r = answerDiagnostic(r, q.id, q.options.find((o) => o.points === 0)!.id);
  return r;
}
function sampleLesson() {
  const l = classroomLessons[1];
  let r = newLessonRun(l.id);
  for (const id of l.scenarioIds) {
    const s = scenarios.find((s) => s.id === id)!;
    let node = s.start;
    const counts = { safe: 0, caution: 0, risk: 0 };
    while (!s.endings[node]) {
      const c = s.nodes[node].choices[0];
      counts[c.assessment]++;
      node = c.next;
    }
    r = recordLessonResult(r, id, s.endings[node].outcome, {
      endingId: node,
      counts,
    });
  }
  for (const q of l.quiz)
    r = answerLesson(r, q.id, q.options.find((o) => o.points === 2)!.id);
  return lessonReport(l, r);
}

for (const width of [390, 1440])
  test(`all six modules open from navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const [name, title] of [
      ["Мне нужна помощь", "Мне нужна помощь"],
      ["Проверить ссылку или QR-код", "Проверить ссылку или QR-код"],
      ["Диагностика", "Диагностика до и после"],
      ["Мой план", "Мой план обучения"],
      ["Для занятий", "Для занятий"],
      ["Источники", "Источники и методика"],
    ]) {
      await go(page, name);
      await expect(
        page.getByRole("heading", { name: title, level: 1, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
test("emergency branches preserve already disclosed codes and money, back/stop clear the path", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("http://localhost:5173")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await go(page, "Мне нужна помощь");
  await page.getByRole("button", { name: /Код, пароль или вход/ }).click();
  await page
    .getByRole("button", {
      name: "Да, сообщил(а) или ввёл(а) на чужой странице",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Банк, карта или платёж", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Банковский доступ мог быть раскрыт" }),
  ).toBeVisible();
  await expect(page.locator(".incident-result")).toContainText("не отменяет");
  await expect(page.locator(".source-status")).toContainText(
    "требуют независимой проверки",
  );
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "true";
    };
  });
  await page
    .getByRole("button", { name: "Распечатать инструкцию", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("button", { name: "Назад", exact: true }),
  ).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page
    .getByRole("button", { name: "Начать заново", exact: true })
    .click();
  await page.getByRole("button", { name: /Деньги или карта/ }).click();
  await page
    .getByRole("button", {
      name: "Деньги уже отправлены или есть неизвестное списание",
      exact: true,
    })
    .click();
  await expect(page.locator(".incident-result")).toContainText("не возвращает");
  await page
    .getByRole("button", { name: "Остановить помощник", exact: true })
    .click();
  await expect(
    page.getByText("Ответы очищены.", { exact: false }),
  ).toBeVisible();
  expect(external).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "money-sent",
  );
});
test("no-action and uncertain help are distinct and never claim protection", async ({
  page,
}) => {
  await page.goto("/");
  await go(page, "Мне нужна помощь");
  await page.getByRole("button", { name: /Подозрительное обращение/ }).click();
  await page
    .getByRole("button", {
      name: "Нет, только получил(а) сообщение или звонок",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Пауза до передачи данных" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Начать заново", exact: true })
    .click();
  await page.getByRole("button", { name: /Другая ситуация/ }).click();
  await page
    .getByRole("button", { name: "Не знаю / Не уверен(а)", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Начните с безопасной паузы" }),
  ).toBeVisible();
});

test("diagnostic completes different forms, reloads, handles negative change and exports no answers", async ({
  page,
}) => {
  await page.goto("/");
  await go(page, "Диагностика");
  await page
    .getByRole("button", { name: "Начать диагностику", exact: true })
    .click();
  await answerForm(page, 2);
  await expect(
    page.getByRole("heading", { name: "Это стартовая точка" }),
  ).toBeVisible();
  await page.reload();
  await go(page, "Диагностика");
  await page
    .getByRole("button", { name: "Пройти итоговую диагностику", exact: true })
    .click();
  await answerForm(page, 0);
  await expect(
    page.getByRole("heading", { name: "Ваши результаты до и после" }),
  ).toBeVisible();
  await expect(page.locator(".score-summary")).toContainText("-100 п. п.");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", {
        name: "Экспортировать обезличенную сводку",
        exact: true,
      })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe("cybershield-diagnostic.json");
  const r = await page.evaluate(
    () => JSON.parse(localStorage.getItem("cybershield-diagnostics-v1")!).run,
  );
  expect(r.order).toMatch(/A-B|B-A/);
  expect(Object.keys(r.pre)[0][0]).not.toBe(Object.keys(r.post)[0][0]);
  await page
    .getByRole("button", {
      name: "Начать отдельную повторную проверку",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Повторная проверка · вопрос 1 из 12/),
  ).toBeVisible();
});
test("a diagnostic pause stays incomplete and blocked storage preserves only in-tab state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("denied", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await go(page, "Диагностика");
  await page
    .getByRole("button", { name: "Начать диагностику", exact: true })
    .click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Подтвердить ответ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Пауза без оценки", exact: true })
    .click();
  await expect(page.getByText(/Входных ответов: 1 \/ 12/)).toBeVisible();
  await expect(page.locator(".score-summary")).toHaveCount(0);
  await go(page, "Практика");
  await go(page, "Диагностика");
  await expect(page.getByText(/Входных ответов: 1 \/ 12/)).toBeVisible();
  await expect(page.getByText(/Браузер не разрешил сохранить/)).toBeVisible();
});
test("diagnostic recommendations take precedence and a plan completion is recorded once", async ({
  page,
}) => {
  await page.addInitScript(
    (run) =>
      localStorage.setItem(
        "cybershield-diagnostics-v1",
        JSON.stringify({ revision: 1, run }),
      ),
    seededDiagnostic(),
  );
  await page.goto("/");
  await go(page, "Мой план");
  await page
    .getByRole("button", {
      name: "Построить план из пяти историй",
      exact: true,
    })
    .click();
  const plan = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cybershield-learning-plan-v1")!).plan,
  );
  expect(plan.source).toBe("diagnostic-post");
  expect(new Set(plan.scenarioIds).size).toBe(5);
  await page.locator(".plan-route>li").first().getByRole("button").click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Мне некомфортно", exact: true })
    .click();
  await page
    .getByRole("button", { name: "К моему плану", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        Object.keys(
          JSON.parse(localStorage.getItem("cybershield-learning-plan-v1")!).plan
            .results,
        ).length,
    ),
  ).toBe(0);
  await page.locator(".plan-route>li").first().getByRole("button").click();
  await finishStory(page, plan.scenarioIds[0]);
  await page.locator(".plan-route>li").first().getByRole("button").click();
  await finishStory(page, plan.scenarioIds[0]);
  expect(
    await page.evaluate(
      () =>
        Object.keys(
          JSON.parse(localStorage.getItem("cybershield-learning-plan-v1")!).plan
            .results,
        ).length,
    ),
  ).toBe(1);
});
test("legacy learning data is retained and its weaker recommendation is explained", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "cybershield-progress-v1",
      JSON.stringify([
        {
          id: "friend-account",
          outcome: "risk",
          completedAt: "2026-11-14T12:00:00.000Z",
        },
      ]),
    ),
  );
  await page.goto("/");
  await go(page, "Мой план");
  await expect(
    page.getByText(/слабая предварительная эвристика/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Построить план из пяти историй",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Очистить мои рекомендации", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Подтвердить очистку рекомендаций",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("cybershield-progress-v1")!).length,
    ),
  ).toBe(1);
});
test("a direct lesson URL generates a real local QR and printable material", async ({
  page,
}) => {
  await page.goto("/?lesson=payment-safety");
  await expect(
    page.getByRole("heading", {
      name: classroomLessons[1].title,
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  const canvas = page.getByRole("img", {
    name: "QR-код публичной ссылки на занятие",
  });
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width))
    .toBe(240);
  const pixels = await canvas.evaluate((c: HTMLCanvasElement) => ({
    data: Array.from(
      c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data,
    ),
    width: c.width,
    height: c.height,
  }));
  expect(
    jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data,
  ).toBe(
    "https://denischunaev117.github.io/CyberShield/?lesson=payment-safety",
  );
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page
    .getByRole("button", { name: "Распечатать методический лист", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".teacher-key")).toBeVisible();
  await expect(page.locator(".skip-link")).toBeHidden();
  await expect(page.locator(".classroom-work")).toBeHidden();
  await expect(page.locator(".group-sheet")).toBeHidden();
  await expect(page.locator(".lesson-sheet")).toContainText(
    "Практические истории занятия",
  );
});
test("classroom imports three anonymous reports and rejects invalid data without exposing small-group skills", async ({
  page,
}) => {
  await page.goto("/");
  await go(page, "Для занятий");
  const report = sampleLesson();
  const files = [
    ...Array.from({ length: 3 }, (_, i) => ({
      name: `sample-${i}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(report)),
    })),
    {
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...report, name: "fiction" })),
    },
  ];
  await page.getByLabel("Выбрать JSON-результаты").setInputFiles(files);
  await expect(page.getByRole("status")).toContainText("Принято сводок: 3");
  await expect(page.getByRole("alert")).toContainText("Файл 4");
  await expect(page.locator(".group-sheet")).toContainText("Сводок N: 3");
  await expect(page.locator(".group-sheet")).toContainText(
    "детализация скрыта",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Экспортировать CSV группы", exact: true })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe("cybershield-group.csv");
});
test("new algorithms run offline once their local modules have loaded", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () => document.documentElement.dataset.localTools === "ready",
  );
  await context.setOffline(true);
  await go(page, "Проверить ссылку или QR-код");
  await page
    .getByRole("textbox", { name: "Ссылка для проверки" })
    .fill("https://example.com/");
  await page
    .getByRole("button", { name: "Разобрать адрес", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Адрес разобран на устройстве",
      exact: true,
    }),
  ).toBeVisible();
  await go(page, "Мне нужна помощь");
  await expect(
    page.getByRole("button", { name: /Другая ситуация/ }),
  ).toBeVisible();
  await go(page, "Для занятий");
  await expect(
    page.getByRole("button", { name: classroomLessons[0].title, exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
});
for (const theme of ["light", "dark"])
  for (const lowVision of [false, true])
    test(`new pages accessibility ${theme} lowVision=${lowVision}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (p) =>
          localStorage.setItem("cybershield-preferences-v1", JSON.stringify(p)),
        { theme, lowVision },
      );
      await page.goto("/");
      for (const section of [
        "Мне нужна помощь",
        "Проверить ссылку или QR-код",
        "Диагностика",
        "Мой план",
        "Для занятий",
        "Источники",
      ]) {
        await go(page, section);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              reason: n.failureSummary,
            })),
          })),
        ).toEqual([]);
      }
    });
test("production subdirectory opens all new lazy modules and preserves the lesson route", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/CyberShield/?lesson=payment-safety");
  await expect(
    page.getByRole("heading", {
      name: classroomLessons[1].title,
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await go(page, "Проверить ссылку или QR-код");
  expect(page.url()).not.toContain("lesson=");
  await expect(
    page.getByRole("heading", {
      name: "Проверить ссылку или QR-код",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await go(page, "Диагностика");
  await expect(
    page.getByRole("button", { name: "Начать диагностику", exact: true }),
  ).toBeVisible();
});
