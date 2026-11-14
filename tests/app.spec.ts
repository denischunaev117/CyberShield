import { scenarioChannels } from "../src/engine";
import { scenarios } from "../src/content/scenarios";
import { test, expect } from "@playwright/test";
test("full verification path, debrief and persistence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Попробовать ситуацию" }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", {
      name: "Позвоню тебе по сохранённому номеру.",
      exact: false,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Выйду из чата и всё равно наберу знакомый номер.",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы проверили, прежде чем действовать" }),
  ).toBeVisible();
  await expect(page.locator(".decision-list li")).toHaveCount(2);
  await page.getByRole("button", { name: "К ситуациям", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Мой прогресс", exact: true }).click();
  await expect(page.getByText(`1 из ${scenarios.length}`)).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("cybershield-progress-v1"),
  );
  expect(saved).not.toContain("choice");
  expect(saved).not.toContain("Позвоню");
});
test("SMS failure explains consequences and supports retry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "SMS", exact: true }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => scenarioChannels(s).includes("sms")).length,
  );
  await page.getByRole("button", { name: /Ваша посылка задержана/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", {
      name: "Открою ссылку и посмотрю, что просят.",
      exact: false,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Подтвержу все данные, чтобы получить посылку.",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Код подтвердил чужую операцию" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Попробовать другой путь" }).click();
  await expect(
    page.getByRole("button", { name: "Начать ситуацию" }),
  ).toBeVisible();
});
test("genuine request, safe refusal and stopping without an assessment", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Есть минутка помочь/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page.getByRole("button", { name: "Мне некомфортно" }).click();
  await expect(
    page.getByRole("heading", { name: "Можно сделать паузу" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("cybershield-progress-v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Продолжить эту ситуацию" }).click();
  await page
    .getByRole("button", {
      name: "Сейчас не готов давать в долг, извини.",
      exact: false,
    })
    .click();
  await expect(
    page.getByText("В этой истории обращение было настоящим."),
  ).toBeVisible();
});
test("mobile layout, search and keyboard close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("textbox", { name: "Поиск ситуаций" })
    .fill("нет такого");
  await expect(page.getByText("Таких ситуаций пока нет")).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(scenarios.length);
  await page.getByRole("button", { name: "Попробовать ситуацию" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".simulation-dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "О приложении и настройках" }).click();
  await page.getByLabel("Версия для слабовидящих", { exact: false }).check();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
test("corrupt local progress does not break the application", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("cybershield-progress-v1", "broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Мой прогресс", exact: true }).click();
  await expect(page.getByText(`0 из ${scenarios.length}`)).toBeVisible();
});

test("Telegram and WhatsApp have distinct channels and working branches", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Telegram", exact: true }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => scenarioChannels(s).includes("telegram")).length,
  );
  await page.getByRole("button", { name: /Поддержи племянницу/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await expect(page.locator(".chat-device.telegram")).toBeVisible();
  await page.getByRole("button", { name: /Уточню у Ольги/ }).click();
  await page
    .getByRole("button", { name: /Предупрежу Ольгу и не передам код/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Аккаунт остался под вашим контролем" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "К ситуациям", exact: true }).click();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => scenarioChannels(s).includes("whatsapp")).length,
  );
  await page.getByRole("button", { name: /Квартира ещё свободна/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await expect(page.locator(".chat-device.whatsapp")).toBeVisible();
  await page.getByRole("button", { name: /Переведу бронь/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Бронь ушла автору поддельного объявления",
    }),
  ).toBeVisible();
});
test("voice plays, stops on a branch transition, and is removed on pause and retry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Звонки", exact: true }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => scenarioChannels(s).includes("call")).length,
  );
  await page.getByRole("button", { name: /Переведите на резервный/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("src", "/audio/call-bank-start.mp3");
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Слушать реплику", exact: true })
    .click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await audio.evaluate((a: HTMLAudioElement) => {
    (window as Window & { previousAudio?: HTMLAudioElement }).previousAudio = a;
  });
  await page
    .getByRole("button", { name: /Назовите отдел и номер заявки/ })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { previousAudio?: HTMLAudioElement }).previousAudio
          ?.paused,
    ),
  ).toBe(true);
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "/audio/call-bank-detail.mp3",
  );
  await page.getByRole("button", { name: "Мне некомфортно" }).click();
  await expect(page.locator("audio")).toHaveCount(0);
  await page.getByRole("button", { name: "Продолжить эту ситуацию" }).click();
  await page
    .getByRole("button", { name: /Сначала отправлю один рубль/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Проверочный перевод не проверил собеседника",
    }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  await page.getByRole("button", { name: "Попробовать другой путь" }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "/audio/call-bank-start.mp3",
  );
});
test("audio failure keeps text and choices usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/audio/*.mp3", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Звонки", exact: true }).click();
  await page.getByRole("button", { name: /Ваш номер отключат/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await expect(
    page.getByText("Аудио недоступно. Можно продолжить по тексту ниже."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("button", { name: /Проверю договор в приложении/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "После вашего решения", exact: true }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Не передам код и проверю активные сеансы/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы проверили назначение кода" }),
  ).toBeVisible();
});

test("email changes to WhatsApp while history keeps the original speakers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Почта", exact: true }).click();
  await page
    .getByRole("button", { name: /Счёт обновился перед оплатой/ })
    .click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await expect(page.locator(".chat-device.email")).toBeVisible();
  await page.getByRole("button", { name: /Отвечу на письмо/ }).click();
  await expect(page.locator(".chat-device.whatsapp")).toBeVisible();
  await expect(page.locator(".chat-header b")).toHaveText("Новый бухгалтер");
  await expect(page.locator(".message-source").first()).toContainText(
    "Расчётный отдел",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page
    .getByRole("button", { name: /Свяжусь с мастером по номеру из договора/ })
    .click();
  await expect(page.locator(".chat-device.email")).toBeVisible();
  await expect(page.locator(".narrator-event").last()).toContainText(
    "Мастер по номеру из договора",
  );
  await page
    .getByRole("button", { name: /Передам подозрительное письмо мастеру/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Подмена счёта обнаружена до оплаты" }),
  ).toBeVisible();
  await expect(page.locator(".decision-list li")).toHaveCount(3);
});
test("a paid invoice remains a loss after the person stops", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Счёт обновился перед оплатой/ })
    .click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page.getByRole("button", { name: /Оплачу новый счёт/ }).click();
  await page
    .getByRole("button", { name: /Остановлю платежи, обращусь в банк/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы остановили дальнейшие платежи" }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "не вернулся автоматически",
  );
  await expect(page.locator(".decision-marker.risk")).toHaveCount(1);
});
test("genuine invitation has different safe endings and no forced payment", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Заявка на учебный конкурс/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", { name: /Найду объявление через сайт школы/ })
    .click();
  await expect(page.locator(".choices>button")).toHaveCount(3);
  await page.getByRole("button", { name: /Сначала подготовлю проект/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Идея сохранена без поспешной отправки данных",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("В этой истории обращение было настоящим."),
  ).toBeVisible();
});

test("Belarus intercom story exposes SMS evidence, escalates channels and retains account exposure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: /Новые ключи от подъезда/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page.getByRole("button", { name: /Открою SMS и прочитаю/ }).click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await expect(evidence).not.toHaveAttribute("open", "");
  await evidence.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(evidence).toHaveAttribute("open", "");
  await expect(evidence.getByText("••••••", { exact: true })).toBeVisible();
  await expect(page.locator(".choices>button")).toHaveCount(3);
  await page
    .getByRole("button", { name: /Раз это универсальная система/ })
    .click();
  await expect(page.locator(".chat-device.telegram")).toBeVisible();
  await expect(page.locator(".chat-transcript .evidence-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Ничего не переведу, проверю устройства/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы остановили вторую часть обмана" }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "Код уже был раскрыт",
  );
  await expect(
    page.getByRole("heading", { name: "На чём легко ошибиться" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
test("ERIP label is checked against payment evidence before any data is shared", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Штраф: оплатите сегодня/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", { name: /Посмотрю реквизиты и назначение/ })
    .click();
  await expect(page.locator(".chat-device.web")).toBeVisible();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(evidence.getByText("Не указан", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Не буду вводить данные/ }).click();
  await page
    .getByRole("button", { name: /Удалю подозрительное сообщение/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы проверили основание, а не логотип" }),
  ).toBeVisible();
  const review = page.locator(".decision-list .evidence-card");
  await review.locator("summary").click();
  await expect(review.getByText("45 BYN", { exact: true })).toBeVisible();
});
test("genuine wallet confirmation differs from sending code to somebody", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Добавление карты: это делали вы/ })
    .click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page.getByRole("button", { name: /Сопоставлю назначение SMS/ }).click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(evidence.getByText("Никто", { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: /Подтвержу внутри самостоятельно открытого приложения/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вы подтвердили собственное действие" }),
  ).toBeVisible();
  await expect(
    page.getByText("В этой истории обращение было настоящим."),
  ).toBeVisible();
});
test("card rental does not become a clean success after receiving third-party funds", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Карта на вечер/ }).click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", { name: /Соглашусь, ведь деньги проходят не мои/ })
    .click();
  await page
    .getByRole("button", { name: /Не буду пересылать. Свяжусь с банком/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Дальнейшее движение денег остановлено",
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "Чужое поступление уже состоялось",
  );
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cybershield-progress-v1") || "[]"),
  );
  expect(records.at(-1).outcome).toBe("caution");
});
test("token revocation acknowledges previous unwanted changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Аналитика просит полный токен/ })
    .click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", { name: /Сопоставлю запрошенные права/ })
    .click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(
    evidence.getByText("Чтение и изменение данных", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Создам отдельный полный ключ/ })
    .click();
  await page
    .getByRole("button", { name: /Отзову раскрытый токен через кабинет/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Токен отозван после нежелательных изменений",
    }),
  ).toBeVisible();
  await expect(page.locator(".ending-description")).toContainText(
    "отзыв не отменяет",
  );
});
test("credit obligation remains after the phone has been sold", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Наличные через телефон в рассрочку/ })
    .click();
  await page.getByRole("button", { name: "Начать ситуацию" }).click();
  await page
    .getByRole("button", { name: /Сначала сравню получаемую сумму/ })
    .click();
  const evidence = page.locator(".chat-transcript .evidence-card");
  await evidence.locator("summary").click();
  await expect(evidence.getByText("1100 BYN", { exact: true })).toBeVisible();
  await expect(evidence.getByText("500 BYN", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /Подпишу, а посредник потом поможет/ })
    .click();
  await page
    .getByRole("button", { name: /Передам телефон за обещанные/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Телефон отдан, обязательство осталось",
    }),
  ).toBeVisible();
});

test("new Belarus collection combines with search and can reset all filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: /Открыть подборку/ }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(
    scenarios.filter((s) => s.source?.document === "belarus-2026").length,
  );
  await expect(
    page.getByRole("button", { name: /Показать все истории/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Поиск ситуаций" })
    .fill("несуществующая история");
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.locator(".scenario-card")).toHaveCount(scenarios.length);
  await expect(
    page.getByRole("button", { name: /Открыть подборку/ }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});
