import { parse as parseDomain } from "tldts";
import { toUnicode } from "tr46";
export type LinkSignal = {
  id: string;
  title: string;
  severity: "high" | "medium" | "info";
  reason: string;
  advice: string;
  detail?: string;
};
export type LinkAnalysis = {
  revision: 1;
  protocol: string;
  hostname: string;
  unicodeHostname: string;
  domain: string | null;
  port: string;
  inferredProtocol: boolean;
  signals: LinkSignal[];
  level: "high" | "attention" | "unknown";
  destination: "not-requested";
  redirectHosts: string[];
};
const brands = [
  {
    name: "Беларусбанк",
    roots: ["belarusbank.by", "asb.by"],
    words: ["belarusbank", "беларусбанк"],
  },
  {
    name: "Белинвестбанк",
    roots: ["belinvestbank.by"],
    words: ["belinvestbank", "белинвестбанк"],
  },
  {
    name: "Приорбанк",
    roots: ["priorbank.by", "prior.by"],
    words: ["priorbank", "приорбанк"],
  },
  {
    name: "Альфа Банк",
    roots: ["alfabank.by"],
    words: ["alfabank", "альфабанк"],
  },
  { name: "Национальный банк", roots: ["nbrb.by"], words: ["nbrb", "нацбанк"] },
  { name: "МВД", roots: ["mvd.gov.by"], words: ["mvd", "мвд"] },
  { name: "МНС", roots: ["nalog.gov.by"], words: ["nalog", "налог"] },
  { name: "Telegram", roots: ["telegram.org", "t.me"], words: ["telegram"] },
  {
    name: "Apple",
    roots: ["apple.com", "icloud.com"],
    words: ["apple", "icloud"],
  },
];
const shorteners = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "t.ly",
  "cutt.ly",
  "goo.gl",
  "clck.ru",
  "rb.gy",
  "shorturl.at",
  "is.gd",
  "rebrand.ly",
  "ow.ly",
  "buff.ly",
  "tiny.cc",
  "surl.li",
]);
const lookalikes: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
  к: "k",
  м: "m",
  т: "t",
  в: "b",
  н: "h",
  і: "i",
  ј: "j",
  ѕ: "s",
  ӏ: "l",
  α: "a",
  ο: "o",
  ρ: "p",
  ν: "v",
  ι: "i",
  ε: "e",
  χ: "x",
};
export const domainSkeleton = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[аеорсхуктмвніјѕӏαορνιεχ]/g, (c) => lookalikes[c])
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/[01]/g, (c) => (c === "0" ? "o" : "l"));
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  return rows[a.length][b.length];
}
const belongs = (host: string, root: string) =>
  host === root || host.endsWith("." + root);
function unicode(host: string): string {
  const out = toUnicode(host);
  return out.error ? host : (out.domain ?? host);
}
function unwrap(value: string): string {
  let out = value;
  for (let i = 0; i < 3; i++)
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  return out;
}
export function analyzeLink(input: string): LinkAnalysis {
  if (!input.trim())
    throw Error("Вставьте ссылку или сначала прочитайте QR-код.");
  if (input.length > 4096)
    throw Error("Ссылка слишком длинная: максимум 4096 символов.");
  const signals: LinkSignal[] = [];
  const add = (
    id: string,
    title: string,
    severity: LinkSignal["severity"],
    reason: string,
    advice: string,
    detail?: string,
  ) => {
    if (!signals.some((s) => s.id === id))
      signals.push({
        id,
        title,
        severity,
        reason,
        advice,
        ...(detail ? { detail } : {}),
      });
  };
  let raw = input.trim();
  const hidden = (c: string) =>
    c.charCodeAt(0) < 32 ||
    c.charCodeAt(0) === 127 ||
    /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/.test(c);
  if ([...raw].some(hidden)) {
    add(
      "hidden-characters",
      "Скрытые символы в адресе",
      "high",
      "Невидимые или управляющие символы могут менять восприятие ссылки.",
      "Не используйте эту копию адреса. Откройте сервис самостоятельно.",
    );
    raw = [...raw].filter((c) => !hidden(c)).join("");
  }
  const defanged = /^hxxps?:|\[\.\]|\(dot\)|\[dot\]/i.test(raw);
  if (defanged) {
    raw = raw
      .replace(/^hxxp/i, "http")
      .replace(/\[\.\]|\(dot\)|\[dot\]/gi, ".");
    add(
      "masked-address",
      "Адрес записан в изменённом виде",
      "medium",
      "Использована замена протокола или точек. Адрес восстановлен только для локального разбора.",
      "Сверяйте реальное имя сайта, не запускайте восстановленную ссылку автоматически.",
    );
  }
  if (raw.includes("\\")) {
    add(
      "backslash",
      "Обратная косая черта",
      "high",
      "Браузер может трактовать обратную косую черту иначе, чем человек читает адрес.",
      "Откройте нужный сервис самостоятельно, не исправляйте присланный адрес наугад.",
    );
  }
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw))
    throw Error(
      "Это не обычная веб-ссылка HTTP или HTTPS. Содержимое QR-кода не выполнялось.",
    );
  if (/\s/.test(raw))
    throw Error(
      "Внутри адреса есть пробелы или несколько строк. Выберите одну полную ссылку.",
    );
  const inferredProtocol = !hasScheme;
  let url: URL;
  try {
    url = new URL(inferredProtocol ? "https://" + raw : raw);
  } catch {
    throw Error(
      "Не удалось разобрать адрес. Проверьте, что вставлена полная ссылка.",
    );
  }
  if (!url.hostname || url.hostname.length > 253)
    throw Error("В ссылке нет корректного имени сайта.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const unicodeHostname = unicode(hostname);
  const parsed = parseDomain(hostname, { allowPrivateDomains: true });
  const domain = parsed.domain;
  if (inferredProtocol)
    add(
      "protocol-assumed",
      "Протокол не указан",
      "info",
      "Для разбора условно добавлен HTTPS. Это не подтверждает, что исходная ссылка использует защищённое соединение.",
      "Проверяйте полный адрес и самостоятельно открывайте нужный сервис.",
    );
  if (url.protocol === "http:")
    add(
      "insecure-http",
      "Незащищённое соединение HTTP",
      "high",
      "HTTP не защищает передаваемые данные от чтения и изменения в сети.",
      "Не вводите секреты или реквизиты. Найдите официальный защищённый сервис самостоятельно.",
    );
  if (url.username || url.password)
    add(
      "userinfo",
      "Маскировка адреса через @",
      "high",
      "Часть до @ — не имя сайта назначения. Там может быть название банка или секретные данные.",
      "Смотрите на настоящее имя сайта ниже. Не вводите данные на основании текста перед @.",
    );
  if (url.port)
    add(
      "unusual-port",
      "Необычный порт",
      "medium",
      "Адрес использует явно указанный нестандартный для своего протокола порт.",
      "Для банковского или государственного сервиса это повод перепроверить адрес независимо.",
      url.port,
    );
  if (parsed.isIp || hostname.startsWith("["))
    add(
      "ip-address",
      "IP-адрес вместо имени сайта",
      "medium",
      "Числовой адрес не подтверждает связь с банком или организацией. Некоторые нестандартные записи браузер преобразует в IP.",
      "Не принимайте такой адрес за официальный ресурс только из-за подписи сообщения.",
    );
  if (
    !domain ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  )
    add(
      "non-public-host",
      "Локальное или неизвестное имя узла",
      "medium",
      "Это может быть локальный адрес, частный узел или неизвестная доменная зона.",
      "Не запускайте ссылку из незнакомого сообщения; уточните назначение через независимый канал.",
    );
  if (hostname.split(".").filter(Boolean).length >= 5)
    add(
      "many-subdomains",
      "Длинная цепочка поддоменов",
      "medium",
      "Множество частей перед основным доменом может скрывать настоящее место назначения.",
      "Сверьте именно основной домен, а не знакомое слово в начале адреса.",
    );
  if (/%[\da-f]{2}/i.test(raw.split(/[/?#]/).slice(0, 3).join("/")))
    add(
      "encoded-host",
      "Закодированные символы в начале адреса",
      "medium",
      "Видимая запись адреса отличается от того, как браузер разбирает имя узла.",
      "Сравните разобранное имя сайта ниже; не полагайтесь на исходную подпись.",
    );
  if (unicodeHostname !== hostname)
    add(
      "international-domain",
      "Международное имя домена",
      "info",
      "В адресе есть международные символы. Само по себе это не означает обман; сравните обычную и техническую запись.",
      "Проверяйте каждую букву и основной домен; похожие символы могут принадлежать разным алфавитам.",
    );
  if (
    unicodeHostname
      .split(".")
      .some((label) => /[a-z]/i.test(label) && /[а-яёіўα-ω]/i.test(label))
  )
    add(
      "mixed-alphabets",
      "Смешение похожих букв разных алфавитов",
      "high",
      "В одной части доменного имени смешаны латинские и другие буквы. Их внешний вид может совпадать.",
      "Не вводите данные. Наберите известный официальный адрес самостоятельно.",
    );
  const skeleton = domainSkeleton(unicodeHostname);
  const mainLabel = domainSkeleton(unicode(domain ?? hostname).split(".")[0]);
  for (const brand of brands) {
    if (brand.roots.some((root) => belongs(hostname, root))) continue;
    const exact =
      brand.words.some((w) => skeleton.includes(domainSkeleton(w))) ||
      brand.roots.some((root) => hostname.includes(root));
    const similar = brand.words
      .filter((w) => /^[a-z]+$/.test(w) && w.length >= 5)
      .some(
        (w) =>
          Math.abs(mainLabel.length - w.length) <= 2 &&
          distance(mainLabel, domainSkeleton(w)) <= 1,
      );
    const embeddedName = brand.words.some((word) =>
      domainSkeleton(unwrap(url.pathname + " " + url.search)).includes(
        domainSkeleton(word),
      ),
    );
    if (embeddedName && !exact && !similar)
      add(
        "brand-in-path",
        "Название организации скрыто в пути или параметрах",
        "medium",
        "Знакомое название находится после имени сайта. Оно не меняет реальный основной домен.",
        "Проверяйте домен назначения, а не название банка в остальной части ссылки.",
        brand.name,
      );
    if (exact || similar)
      add(
        "brand-imitation",
        "Название похоже на известную организацию",
        "high",
        "Адрес напоминает название организации, но не совпадает с известными этой проверке доменами.",
        "Самостоятельно откройте привычное приложение или официальный канал. Похожее имя не подтверждает принадлежность.",
        brand.name,
      );
  }
  if (/(?:gov\.by)/i.test(unicodeHostname) && !belongs(hostname, "gov.by"))
    add(
      "government-imitation",
      "Имитация государственного адреса",
      "high",
      "Знакомое обозначение государственных услуг находится в другом домене.",
      "Откройте нужную услугу независимо; внешний вид страницы и слова в ссылке не подтверждают полномочия.",
    );
  if ([...shorteners].some((root) => belongs(hostname, root)))
    add(
      "shortener",
      "Сокращённая ссылка",
      "medium",
      "Сокращатель скрывает конечный адрес. Проверка не переходила по ссылке и не раскрывала назначение.",
      "Не используйте сокращённую ссылку для платежа или входа. Откройте сервис самостоятельно.",
    );
  const redirectHosts: string[] = [];
  for (const [key, value] of [...url.searchParams.entries()].slice(0, 60)) {
    if (
      !/^(?:url|u|redirect|redirect_uri|redirect_url|next|continue|target|dest|destination|return|returnurl|return_to|rurl|link|goto|redirectto|redir|to)$/i.test(
        key,
      )
    )
      continue;
    const candidate = unwrap(value).trim();
    if (!/^(?:https?:)?\/\//i.test(candidate)) continue;
    try {
      const nested = new URL(candidate, url);
      if (
        nested.hostname !== url.hostname &&
        !redirectHosts.includes(nested.hostname)
      )
        redirectHosts.push(nested.hostname);
    } catch {
      /* Invalid embedded data is never executed. */
    }
  }
  if (redirectHosts.length)
    add(
      "embedded-redirect",
      "В параметрах есть другой адрес",
      "medium",
      "В ссылку вложено другое место назначения. Это признак возможного перенаправления, а не подтверждение фактического перехода.",
      "Сверьте вложенный домен. Не открывайте ссылку ради проверки; реальная цепочка перенаправлений здесь не загружалась.",
    );
  if (
    /\.(?:apk|exe|msi|scr|bat|cmd|dmg|mobileconfig)(?:$|[?#])/i.test(
      unwrap(url.pathname),
    )
  )
    add(
      "download",
      "Ссылка на программу или профиль",
      "medium",
      "Путь похож на загрузку исполняемого файла, приложения или профиля устройства.",
      "Не устанавливайте файлы по входящей просьбе. Проверяйте источник и необходимость независимо.",
    );
  if (url.hash)
    add(
      "fragment",
      "Данные после знака #",
      "info",
      "Фрагмент адреса может использоваться страницей для навигации или скрывать дополнительные данные.",
      "Основной домен остаётся тем же. Полная ссылка не проверялась на содержимое сайта.",
    );
  return {
    revision: 1,
    protocol: url.protocol,
    hostname,
    unicodeHostname,
    domain,
    port: url.port,
    inferredProtocol,
    signals,
    level: signals.some((s) => s.severity === "high")
      ? "high"
      : signals.some((s) => s.severity === "medium")
        ? "attention"
        : "unknown",
    destination: "not-requested",
    redirectHosts,
  };
}
