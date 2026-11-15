import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import QRCode from "qrcode";
async function open(page: import("@playwright/test").Page) {
  await page.goto("/");
  let button = page.getByRole("button", {
    name: "Проверить ссылку или QR-код",
    exact: true,
  });
  if (!(await button.count())) {
    await page
      .getByRole("button", { name: "Все разделы", exact: true })
      .click();
    button = page
      .getByRole("dialog", { name: "Все разделы" })
      .getByRole("button", {
        name: "Проверить ссылку или QR-код",
        exact: true,
      });
  }
  await button.click();
}
test("local URL review explains the real domain and never requests the pasted host", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!/^(localhost|127\.0\.0\.1)$/.test(new URL(r.url()).hostname))
      external.push(r.url());
  });
  await open(page);
  await page
    .getByRole("textbox", { name: "Ссылка для проверки" })
    .fill("https://belarusbank.by@evil.example/?token=private");
  await page
    .getByRole("button", { name: "Разобрать адрес", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Обнаружены опасные признаки в адресе" }),
  ).toBeVisible();
  await expect(page.locator(".url-details")).toContainText("evil.example");
  await expect(page.locator(".analysis-result")).not.toContainText("private");
  expect(external).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "evil.example",
  );
});
test("uploaded QR is decoded on device and selected explicitly for analysis", async ({
  page,
}) => {
  await open(page);
  const qr = await QRCode.toBuffer("https://belarusbank.by.evil.example/pay", {
    width: 500,
    margin: 4,
  });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: qr });
  await expect(
    page.getByRole("textbox", { name: "Ссылка для проверки" }),
  ).toHaveValue("https://belarusbank.by.evil.example/pay");
  await expect(page.locator(".analysis-result")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Разобрать адрес", exact: true })
    .click();
  await expect(page.locator(".analysis-result")).toContainText(
    "Название похоже",
  );
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ссылка для проверки" }),
  ).toHaveValue("");
});
test("non-link QR is never executed and oversized or unsupported images fail clearly", async ({
  page,
}) => {
  await open(page);
  const qr = await QRCode.toBuffer("javascript:alert(1)", { width: 400 });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: qr });
  await expect(
    page.getByRole("textbox", { name: "Ссылка для проверки" }),
  ).toHaveValue("javascript:alert(1)");
  await page
    .getByRole("button", { name: "Разобрать адрес", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("не обычная веб-ссылка");
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({
      name: "unsafe.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.getByRole("alert")).toContainText("PNG");
});
test("camera starts only by explicit request and stops on hiding or leaving", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "cameraStats", {
      value: { starts: 0, stops: 0 },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          const w = window as unknown as {
            cameraStats: { starts: number; stops: number };
          };
          w.cameraStats.starts++;
          return {
            getTracks: () => [
              {
                stop: () => {
                  w.cameraStats.stops++;
                },
              },
            ],
          };
        },
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      set() {},
      get() {
        return null;
      },
      configurable: true,
    });
    HTMLMediaElement.prototype.play = async () => {};
  });
  await open(page);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { cameraStats: { starts: number } }).cameraStats
          .starts,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Сканировать камерой", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Остановить", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { cameraStats: { stops: number } }).cameraStats
          .stops,
    ),
  ).toBeGreaterThan(0);
  await expect(page.locator("video")).toHaveCount(0);
});
test("camera permission resolving after exit is immediately released", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { stops: 0, finish: () => {} };
    Object.defineProperty(window, "pendingCamera", { value: state });
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: () =>
          new Promise((resolve) => {
            state.finish = () =>
              resolve({
                getTracks: () => [
                  {
                    stop: () => {
                      state.stops++;
                    },
                  },
                ],
              });
          }),
      },
    });
  });
  await open(page);
  await page
    .getByRole("button", { name: "Сканировать камерой", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Назад к практике", exact: true })
    .click();
  await page.evaluate(() =>
    (
      window as unknown as { pendingCamera: { finish: () => void } }
    ).pendingCamera.finish(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { pendingCamera: { stops: number } })
            .pendingCamera.stops,
      ),
    )
    .toBe(1);
});
test("screenshot OCR uses same-origin bundled workers and models", async ({
  page,
}) => {
  test.setTimeout(90000);
  const external: string[] = [];
  page.on("request", (r) => {
    if (!/^(localhost|127\.0\.0\.1)$/.test(new URL(r.url()).hostname))
      external.push(r.url());
  });
  await open(page);
  const canvas = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1250;
    c.height = 220;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "black";
    x.font = "42px Arial";
    x.fillText("https://example.com/login", 40, 110);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({
      name: "message.png",
      mimeType: "image/png",
      buffer: Buffer.from(canvas, "base64"),
    });
  await expect(
    page.getByText("QR-код не найден.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Найти ссылку в тексте изображения",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "https://example.com/login",
      exact: true,
    }),
  ).toBeVisible({ timeout: 80000 });
  await page
    .getByRole("button", { name: "https://example.com/login", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Ссылка для проверки" }),
  ).toHaveValue("https://example.com/login");
  expect(external).toEqual([]);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    ),
  ).not.toContain("example.com/login");
});
for (const lowVision of [false, true])
  test(`URL warning fits a narrow screen and is accessible, lowVision=${lowVision}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.addInitScript(
      (lowVision) =>
        localStorage.setItem(
          "cybershield-preferences-v1",
          JSON.stringify({ theme: "dark", lowVision }),
        ),
      lowVision,
    );
    await open(page);
    await page
      .getByRole("textbox", { name: "Ссылка для проверки" })
      .fill(
        "https://belаrusbank.by.evil.example:8443/?next=https://other.example",
      );
    await page
      .getByRole("button", { name: "Разобрать адрес", exact: true })
      .click();
    await expect(page.locator(".analysis-result")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(report.violations).toEqual([]);
  });

test("production subdirectory loads URL checks, QR reading, and all OCR assets locally", async ({
  page,
}) => {
  test.setTimeout(90000);
  const assets: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/ocr/")) assets.push(new URL(r.url()).pathname);
  });
  await page.goto("http://127.0.0.1:4173/CyberShield/");
  await page
    .getByRole("button", { name: "Проверить ссылку или QR-код", exact: true })
    .first()
    .click();
  const qr = await QRCode.toBuffer(
    "https://example.com/?next=https://other.example",
    { width: 450 },
  );
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({ name: "code.png", mimeType: "image/png", buffer: qr });
  await expect(
    page.getByRole("textbox", { name: "Ссылка для проверки" }),
  ).toHaveValue("https://example.com/?next=https://other.example");
  await page
    .getByRole("button", { name: "Разобрать адрес", exact: true })
    .click();
  await expect(page.locator(".analysis-result")).toContainText(
    "В параметрах есть другой адрес",
  );
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 220;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "black";
    x.font = "42px Arial";
    x.fillText("https://example.com/pay", 40, 110);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Выбрать изображение: PNG, JPEG или WebP, до 10 МБ")
    .setInputFiles({
      name: "text.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(
    page.getByText("QR-код не найден.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Найти ссылку в тексте изображения",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "https://example.com/pay", exact: true }),
  ).toBeVisible({ timeout: 80000 });
  expect(assets.length).toBeGreaterThan(3);
  expect(assets.every((p) => p.startsWith("/CyberShield/ocr/"))).toBeTruthy();
});
