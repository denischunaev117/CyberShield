import { riskRules } from "./rules";
export function sensitiveMessageProblem(text: string): string | null {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))
    return "Удалите адрес электронной почты.";
  if (
    /(?:\+?\d[\s()-]*){10,}/.test(text) ||
    /\b[A-ZА-Я]{2}\s?\d{7}\b/i.test(text)
  )
    return "Удалите похожий на телефон, реквизиты или документ номер.";
  if (
    /(?:код|парол[ьяь]|cvv|cvc|пин)\s*(?:из SMS\s*)?[:=—-]?\s*\d{3,}/i.test(
      text,
    )
  )
    return "Удалите сам код или пароль. Оставьте только слова «код из SMS» или «пароль».";
  if (
    /https?:\/\/\S*[?&](?:token|code|auth|password|key|session|access_token)=/i.test(
      text,
    ) ||
    /https?:\/\/\S*\/[a-z0-9_-]{24,}/i.test(text)
  )
    return "В ссылке может быть секретный токен. Удалите параметры и личный фрагмент ссылки.";
  return null;
}
export type RiskAnalysis = {
  revision: 1;
  level: "high" | "attention" | "none";
  ruleIds: string[];
};
export function analyzeMessage(text: string): RiskAnalysis {
  if (!text.trim()) throw Error("Вставьте обезличенный текст сообщения.");
  if (text.length > 3000) throw Error("Максимум 3000 символов.");
  const problem = sensitiveMessageProblem(text);
  if (problem) throw Error(problem);
  const found = riskRules.filter((r) => r.test(text));
  return {
    revision: 1,
    level: found.some((r) => r.severity === "high")
      ? "high"
      : found.length
        ? "attention"
        : "none",
    ruleIds: found.map((r) => r.id),
  };
}
export const relatedByRule: Record<string, string[]> = {
  "secret-request": ["tg-vote", "call-mobile"],
  "device-control": ["protective-apk", "internship-qr"],
  "unexpected-payment": ["wa-return", "call-secret-operation"],
  "third-party-payee": ["invoice-switch", "wa-buyer"],
  "unverified-link": ["parcel-sms", "parking-qr"],
};
