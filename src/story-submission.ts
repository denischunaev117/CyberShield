export const storyRecipient = "chunaevdenis@gmail.com";
export const storyEndpoint = `https://formsubmit.co/ajax/${storyRecipient}`;
export function storyProblem(text: string): string | null {
  if (text.trim().length < 80)
    return "Расскажите чуть подробнее — нужно не менее 80 символов: что произошло, что просили сделать и чем всё закончилось.";
  if (text.length > 6000) return "Сократите историю до 6000 символов.";
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))
    return "В тексте найден адрес электронной почты. Удалите контакты и замените людей их ролями.";
  if (
    /(?:\+?\d[\s()-]*){10,}/.test(text) ||
    /\b[A-ZА-Я]{2}\s?\d{7}\b/i.test(text)
  )
    return "В тексте похожий на телефон, реквизиты или номер документа фрагмент. Удалите эти данные.";
  if (/(?:https?:\/\/|www\.|t\.me\/|@[\wа-я])/i.test(text))
    return "Удалите ссылки и имена аккаунтов. Достаточно названия сервиса: например, Telegram или Белпочта.";
  if (/(?:код|парол[ьяь]|cvc|cvv|пин)\s*[:=—-]?\s*\d{3,}/i.test(text))
    return "Удалите код или пароль. Напишите просто «код из SMS» или «пароль».";
  return null;
}
export async function submitStory(
  story: string,
  channel: string,
  honey: string,
  signal: AbortSignal,
) {
  const problem = storyProblem(story);
  if (problem) throw new Error(problem);
  const response = await fetch(storyEndpoint, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: "История для сценария КиберЩита",
      _template: "table",
      _honey: honey,
      _url: `${window.location.origin}${window.location.pathname}`,
      История: story.trim(),
      "Канал обращения": channel,
    }),
  });
  if (!response.ok)
    throw new Error(
      "Сервис отправки сейчас недоступен. История осталась на экране — попробуйте позже.",
    );
  const data = await response.json();
  const message = typeof data.message === "string" ? data.message : "";
  if (/activat|confirm.*email|check.*email/i.test(message))
    return "activation-required" as const;
  if (data.success !== true && data.success !== "true")
    throw new Error(
      "Сервис не подтвердил приём заявки. История осталась на экране — попробуйте позже.",
    );
  return "accepted" as const;
}
