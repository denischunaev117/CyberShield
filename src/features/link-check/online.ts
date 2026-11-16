import { Capacitor } from "@capacitor/core";
import { nativeOnlineRequest } from "../../platform/native-online";

export const linkCheckEndpoint =
  "https://cybershield-link-check.chunaevdenis.workers.dev/check";

const threatTypes = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const;
export type ThreatType = (typeof threatTypes)[number];
export type OnlineResult = {
  verdict: "dangerous" | "no_known_threats";
  provider: "google-safe-browsing";
  checkedAt: string;
  threatTypes: ThreatType[];
  scope: "submitted-url-only";
  redirectsChecked: false;
};

export function prepareOnlineAddress(value: string): string {
  const raw = value.trim();
  if (
    !raw ||
    raw.length > 4096 ||
    [...raw].some(
      (char) =>
        char.charCodeAt(0) < 32 ||
        char.charCodeAt(0) === 127 ||
        /[\s\\\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(char),
    )
  )
    throw Error(
      "Для онлайн-проверки вставьте один обычный адрес HTTP или HTTPS без скрытых символов.",
    );
  let address: URL;
  try {
    address = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw Error(
      "Не удалось разобрать адрес. Проверьте, что вставлена полная ссылка.",
    );
  }
  if (!["http:", "https:"].includes(address.protocol))
    throw Error(
      "Это не обычная веб-ссылка HTTP или HTTPS. Содержимое QR-кода не выполнялось.",
    );
  const fragment = address.hash.slice(1);
  const fragmentParameters = new URLSearchParams(
    fragment.includes("?")
      ? fragment.slice(fragment.indexOf("?") + 1)
      : fragment,
  );
  if (
    address.username ||
    address.password ||
    [...address.searchParams.keys(), ...fragmentParameters.keys()].some((key) =>
      /^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|passwd|pass|secret|api[_-]?key|key|auth|authorization|session(?:id)?|code|signature|sig)$/i.test(
        key,
      ),
    )
  )
    throw Error(
      "В ссылке могут быть пароль, код или личный токен. Она не отправлена. Используйте локальный разбор адреса.",
    );
  const host = address.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !host.includes(".") ||
    host.length > 253 ||
    host.startsWith("[") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion|arpa)$/.test(
      host,
    )
  )
    throw Error(
      "Онлайн-проверка поддерживает публичные доменные имена. Для этого адреса доступен локальный разбор.",
    );
  return address.href;
}

export function readOnlineResult(value: unknown): OnlineResult {
  const data = value as Partial<OnlineResult> | null;
  if (
    !data ||
    typeof data !== "object" ||
    !["dangerous", "no_known_threats"].includes(data.verdict ?? "") ||
    data.provider !== "google-safe-browsing" ||
    data.scope !== "submitted-url-only" ||
    data.redirectsChecked !== false ||
    typeof data.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(data.checkedAt)) ||
    Date.now() - Date.parse(data.checkedAt) > 25 * 60 * 1000 ||
    Date.parse(data.checkedAt) - Date.now() > 5 * 60 * 1000 ||
    !Array.isArray(data.threatTypes) ||
    !data.threatTypes.every((type) => threatTypes.includes(type)) ||
    (data.verdict === "dangerous") !== data.threatTypes.length > 0
  )
    throw Error(
      "Сервис вернул неполный или устаревший результат. Повторите проверку.",
    );
  return data as OnlineResult;
}

type Transport = (url: string, init: RequestInit) => Promise<Response>;
const defaultTransport: Transport = (url, init) =>
  Capacitor.isNativePlatform()
    ? nativeOnlineRequest(url, init)
    : fetch(url, init);
export async function checkOnline(
  value: string,
  signal: AbortSignal,
  transport: Transport = defaultTransport,
): Promise<OnlineResult> {
  const url = prepareOnlineAddress(value);
  const abort = new AbortController();
  const cancel = () => abort.abort();
  if (signal.aborted) abort.abort();
  else signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 12000);
  try {
    const response = await transport(linkCheckEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, consent: true }),
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: abort.signal,
    });
    if (!response.ok) {
      if (response.status === 429)
        throw Error(
          "Слишком много проверок. Подождите минуту и повторите попытку.",
        );
      throw Error(
        "Сервис проверки временно недоступен. Повторите попытку позже.",
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw Error(
        "Сервис вернул неполный или устаревший результат. Повторите проверку.",
      );
    }
    return readOnlineResult(data);
  } catch (error) {
    if (abort.signal.aborted && !signal.aborted)
      throw Error("Сервис не ответил вовремя. Повторите проверку.");
    if (error instanceof TypeError)
      throw Error(
        "Нет связи с сервисом проверки. Проверьте интернет и повторите попытку.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}

export const threatDescriptions: Record<ThreatType, string> = {
  MALWARE: "Вредоносное программное обеспечение",
  SOCIAL_ENGINEERING: "Фишинг или социальная инженерия",
  UNWANTED_SOFTWARE: "Нежелательное программное обеспечение",
  POTENTIALLY_HARMFUL_APPLICATION: "Потенциально вредоносное приложение",
};
