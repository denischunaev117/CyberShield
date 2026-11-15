export type Reference = {
  id: string;
  title: string;
  organization: string;
  url: string;
  status: "checked" | "pending";
  checkedAt?: string;
  attemptedAt?: string;
  topicIds: string[];
  note: string;
};
const attemptedAt = "2026-11-15";
const pending = (
  id: string,
  title: string,
  organization: string,
  url: string,
  topicIds: string[],
): Reference => ({
  id,
  title,
  organization,
  url,
  status: "pending",
  attemptedAt,
  topicIds,
  note: "Доступ из среды разработки отклонён сетевым прокси. Содержимое и актуальность этой страницы не подтверждены; запись ожидает внешней проверки. Номер службы отсюда не извлекался.",
});
export const references: Reference[] = [
  pending(
    "nbrb",
    "Официальный ресурс Национального банка",
    "Национальный банк Республики Беларусь",
    "https://www.nbrb.by/",
    ["payment", "credentials"],
  ),
  pending(
    "mvd",
    "Официальный ресурс МВД",
    "МВД Республики Беларусь",
    "https://mvd.gov.by/",
    ["payment", "unknown", "suspicious-contact"],
  ),
  pending(
    "belpost",
    "Официальный ресурс почтовой службы",
    "Белпочта",
    "https://belpost.by/",
    ["suspicious-contact", "phishing-site"],
  ),
  pending(
    "belarusbank",
    "Официальный ресурс банка",
    "Беларусбанк",
    "https://belarusbank.by/",
    ["payment", "credentials"],
  ),
  pending(
    "belinvestbank",
    "Официальный ресурс банка",
    "Белинвестбанк",
    "https://www.belinvestbank.by/",
    ["payment", "credentials"],
  ),
  pending(
    "priorbank",
    "Официальный ресурс банка",
    "Приорбанк",
    "https://www.priorbank.by/",
    ["payment"],
  ),
  pending(
    "alfabank",
    "Официальный ресурс банка",
    "Альфа Банк Беларусь",
    "https://www.alfabank.by/",
    ["payment"],
  ),
  pending(
    "tax",
    "Официальный ресурс налоговой службы",
    "Министерство по налогам и сборам",
    "https://nalog.gov.by/",
    ["suspicious-contact"],
  ),
  pending(
    "nces",
    "Официальный ресурс центра электронных услуг",
    "НЦЭУ",
    "https://nces.by/",
    ["phishing-site", "credentials"],
  ),
  pending(
    "epasluga",
    "Портал электронных услуг",
    "Е-Паслуга",
    "https://e-pasluga.by/",
    ["phishing-site"],
  ),
  pending(
    "telegram",
    "FAQ и защита аккаунта",
    "Telegram",
    "https://telegram.org/faq",
    ["account-takeover", "credentials"],
  ),
  pending(
    "apple",
    "Материалы поддержки о социальной инженерии",
    "Apple Support",
    "https://support.apple.com/102568",
    ["device", "phishing-site"],
  ),
  ...[
    ["contrast-minimum", "20", "Контраст текста"],
    ["contrast-enhanced", "20", "Усиленный контраст"],
    ["resize-text", "20", "Увеличение текста"],
    ["reflow", "21", "Перестроение интерфейса"],
    ["text-spacing", "21", "Пользовательские интервалы"],
    ["target-size-minimum", "22", "Размеры управления"],
  ].map(([id, section, title]): Reference => ({
    id: `wcag-${id}`,
    title,
    organization: "W3C / WAI",
    url: `https://github.com/w3c/wcag/blob/main/understanding/${section}/${id}.html`,
    status: "checked",
    checkedAt: "2026-11-14",
    topicIds: ["accessibility"],
    note: "Прочитано официальное пояснение в репозитории W3C. Это источник проектных ориентиров доступности, не экспертная сертификация КиберЩита и не источник банковских рекомендаций.",
  })),
];
export type ContentReview = {
  contentId: string;
  revision: number;
  status: "draft" | "editor-reviewed" | "expert-reviewed";
  referenceIds: string[];
  reviewedAt?: string;
  reviewerRole?: string;
  evidence?: string;
};
export const guideReferenceIds = ["nbrb", "mvd", "telegram", "apple"];
export const reviewFor = (
  contentId: string,
  referenceIds: string[] = guideReferenceIds,
): ContentReview => ({ contentId, revision: 1, status: "draft", referenceIds });
export function validateReferences() {
  if (new Set(references.map((r) => r.id)).size !== references.length)
    throw Error("Повтор источника");
  for (const r of references) {
    const u = new URL(r.url);
    if (u.protocol !== "https:" || u.username || u.password)
      throw Error("Недопустимая ссылка");
    if (r.status === "checked" && !r.checkedAt)
      throw Error("Нет даты проверки");
    for (const d of [r.checkedAt, r.attemptedAt].filter(Boolean) as string[])
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        new Date(d).toISOString().slice(0, 10) !== d
      )
        throw Error("Неверная дата");
  }
}
