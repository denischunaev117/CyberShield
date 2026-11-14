import { test, expect } from "@playwright/test";

test("production bundle works in a repository subdirectory, including real audio playback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("http://127.0.0.1:4173/CyberShield/");
  await expect(page.locator(".scenario-card")).toHaveCount(100);
  await page
    .getByRole("textbox", { name: "Поиск ситуаций" })
    .fill("Помогите секретной проверке");
  await page.locator(".scenario-card").click();
  await page
    .getByRole("button", { name: "Начать ситуацию", exact: true })
    .click();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("src", /\/CyberShield\/audio\/.+\.mp3$/);
  await page
    .getByRole("button", { name: "Слушать реплику", exact: true })
    .click();
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Мне некомфортно", exact: true })
    .click();
  await expect(audio).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
