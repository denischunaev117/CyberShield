import { sourceArchive } from "./source-materials";
export type Reference = {
  id: string;
  title: string;
  organization: string;
  url: string;
  status: "checked" | "provided" | "pending";
  materialIds?: string[];
  checkedAt?: string;
  attemptedAt?: string;
  topicIds: string[];
  note: string;
};
const provided = (
  id: string,
  title: string,
  organization: string,
  url: string,
  topicIds: string[],
  note: string,
): Reference => ({
  id,
  title,
  organization,
  url,
  topicIds,
  note,
  status: "provided",
  materialIds: sourceArchive.materials
    .filter((m) => m.referenceId === id)
    .map((m) => m.id),
});
export const references: Reference[] = [
  provided(
    "nbrb",
    "Схемы финансового мошенничества",
    "Национальный банк Республики Беларусь",
    "https://www.nbrb.by/",
    ["payment", "credentials"],
    "Передана копия материала портала финансовой грамотности: обман при покупках, беда с близкими, опросы, давление и просьбы сообщить данные. Эти признаки требуют проверки, но не устанавливают личность отправителя.",
  ),
  provided(
    "mvd",
    "Профилактика киберпреступлений",
    "МВД Республики Беларусь",
    "https://mvd.gov.by/",
    ["unknown", "suspicious-contact", "payment"],
    "Использованы переданные материалы профилактики и памятки: защита банковских секретов, фишинг, посредники, поддельные поручения, безопасность детей и учётных записей. Не являются подтверждением конкретного дела или одобрением КиберЩита.",
  ),
  provided(
    "belarusbank",
    "Безопасность карточек и дистанционного обслуживания",
    "Беларусбанк",
    "https://belarusbank.by/",
    ["payment", "credentials", "device"],
    "По переданным правилам и памяткам: защита реквизитов и кодов, независимое обращение в банк, опасность удалённого доступа, психологическое давление и действия при инциденте. Корпоративные процедуры не переносятся автоматически на частного клиента.",
  ),
  provided(
    "belinvestbank",
    "Выманивание кодов и актуальные схемы обмана",
    "Белинвестбанк",
    "https://www.belinvestbank.by/",
    ["credentials", "payment", "phishing-site"],
    "По переданным материалам: подмена знакомого, просьбы назвать код или цифры звонка, поддельные формы, защитные переводы и доступ к устройству. Полный набор реквизитов и секреты нельзя передавать по просьбе собеседника.",
  ),
  provided(
    "priorbank",
    "Защита от мошенничества в повседневных ситуациях",
    "Приорбанк",
    "https://www.priorbank.by/",
    ["credentials", "payment", "account-takeover"],
    "Переданные материалы о займах знакомым, покупках, посылках, опросах, работе, кредитах, инвестициях и поддельном входе в банк. Настоящую просьбу следует проверять независимо; для получения выплаты не нужны чужие подтверждения платежей.",
  ),
  provided(
    "alfabank",
    "Разбор схем: от просьбы друга до поддельного директора",
    "Альфа Банк Беларусь",
    "https://www.alfabank.by/",
    ["payment", "device", "suspicious-contact"],
    "По переданным статьям: займы со взломанных аккаунтов, предоплата, лжепокупатели, QR-коды, приложения и NFC, декларирование, инвестиции, подарки, выплаты и поручения бухгалтеру. Знакомый голос, логотип или вид оплаты не гарантируют подлинность.",
  ),
  provided(
    "tax",
    "Противодействие киберпреступлениям",
    "Министерство по налогам и сборам",
    "https://nalog.gov.by/",
    ["payment", "credentials", "suspicious-contact"],
    "В переданном материале разобраны ложные кредиты и декларирование, продление договоров, давление, лжеинвестиции и участие в чужих переводах. Для уточнения обращайтесь через привычный официальный канал, не передавайте коды по входящей инструкции.",
  ),
  provided(
    "telegram",
    "Коды входа и защита аккаунта",
    "Telegram",
    "https://telegram.org/faq",
    ["credentials", "account-takeover"],
    "Из переданной копии FAQ использованы разделы о кодах входа, двухэтапной проверке и завершении чужих сеансов. Коды входа Telegram не передаются другим людям или сервисам. Общие функции мессенджера не являются гарантией честности собеседника.",
  ),
  provided(
    "apple",
    "Социальная инженерия и безопасность учётной записи",
    "Apple Support",
    "https://support.apple.com/102568",
    ["device", "phishing-site", "account-takeover"],
    "По переданным материалам поддержки: поддельные сообщения и звонки, неожиданные запросы секретов, неизвестные вложения и защита учётной записи. Пароли и коды нельзя сообщать собеседнику; проверку начинают через самостоятельно открытые настройки или поддержку.",
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
  revision = 1,
): ContentReview => ({ contentId, revision, status: "draft", referenceIds });
export function validateReferences() {
  if (new Set(references.map((r) => r.id)).size !== references.length)
    throw Error("Повтор источника");
  for (const r of references) {
    const u = new URL(r.url);
    if (u.protocol !== "https:" || u.username || u.password)
      throw Error("Недопустимая ссылка");
    if (
      r.status === "provided" &&
      (!r.materialIds?.length ||
        r.materialIds.some(
          (id) =>
            !sourceArchive.materials.some(
              (m) => m.id === id && m.referenceId === r.id,
            ),
        ))
    )
      throw Error("Нет переданного материала источника");
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
