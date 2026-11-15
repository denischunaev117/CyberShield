import { riskRules } from "./rules";
import { normalizeMessage } from "./normalize";
export function sensitiveMessageProblem(text: string): string | null {
  text = normalizeMessage(text);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))
    return "Удалите адрес электронной почты.";
  if (
    /(?:\+?\d[\s()-]*){10,}/.test(text) ||
    /\b[A-ZА-Я]{2}\s?\d{7}\b/i.test(text)
  )
    return "Удалите похожий на телефон, реквизиты или документ номер.";
  if (
    /(?:код|парол[ьяь]|password|passcode|code|otp|cvv|cvc|pin|пін|пин)\s*(?:из SMS\s*)?[:=—-]?\s*\d{3,}/i.test(
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
  revision: 2;
  level: "high" | "attention" | "none";
  ruleIds: string[];
  combinationIds: string[];
};
export const riskCombinations = [
  {
    id: "link-and-action",
    title:
      "Ссылка вместе с запросом данных, выплатой или тревожным уведомлением",
    first: ["unverified-link", "qr-action"],
    second: [
      "secret-request",
      "card-details",
      "identity-documents",
      "account-alarm",
      "paid-survey",
      "compensation-bait",
      "voting-login",
    ],
  },
  {
    id: "pressure-and-money",
    title: "Давление вместе с просьбой о деньгах или доступе",
    first: ["urgency", "threat", "secrecy"],
    second: [
      "friendly-loan",
      "unexpected-payment",
      "loan-instruction",
      "cash-courier",
      "secret-request",
      "screen-sharing",
      "device-control",
      "prepayment",
    ],
  },
  {
    id: "authority-and-control",
    title: "Имя организации вместе с вмешательством в деньги или устройство",
    first: ["claimed-authority", "fake-manager"],
    second: [
      "loan-instruction",
      "cash-courier",
      "nfc-card",
      "screen-sharing",
      "security-disable",
      "declaration",
      "device-control",
    ],
  },
];
export function analyzeMessage(text: string): RiskAnalysis {
  if (!text.trim()) throw Error("Вставьте обезличенный текст сообщения.");
  if (text.length > 3000) throw Error("Максимум 3000 символов.");
  const problem = sensitiveMessageProblem(text);
  if (problem) throw Error(problem);
  const found = riskRules.filter((r) => r.test(text));
  const ruleIds = found.map((r) => r.id);
  const combinationIds = riskCombinations
    .filter(
      (c) =>
        c.first.some((id) => ruleIds.includes(id)) &&
        c.second.some((id) => ruleIds.includes(id)),
    )
    .map((c) => c.id);
  return {
    revision: 2,
    level:
      found.some((r) => r.severity === "high") || combinationIds.length > 0
        ? "high"
        : found.length
          ? "attention"
          : "none",
    ruleIds,
    combinationIds,
  };
}
export const relatedByRule: Record<string, string[]> = {
  "secret-request": ["tg-vote", "call-mobile"],
  "device-control": ["protective-apk", "internship-qr"],
  "unexpected-payment": ["wa-return", "call-secret-operation"],
  "third-party-payee": ["invoice-switch", "wa-buyer"],
  "unverified-link": ["parcel-sms", "parking-qr"],
};
