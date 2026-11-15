export const skills = [
  {
    id: "identity",
    title: "Проверка личности",
    description: "Связаться с человеком независимо от входящего обращения.",
  },
  {
    id: "authority",
    title: "Проверка полномочий",
    description: "Убедиться, что представитель вправе просить это действие.",
  },
  {
    id: "codes",
    title: "Защита кодов и паролей",
    description:
      "Не передавать секреты третьим лицам и читать назначение подтверждения.",
  },
  {
    id: "payee",
    title: "Проверка получателя",
    description: "Сверить, кому фактически уходят деньги или имущество.",
  },
  {
    id: "purpose",
    title: "Назначение и обязательства",
    description: "Понять, что подтверждается, оплачивается или подписывается.",
  },
  {
    id: "links",
    title: "Проверка сайтов и ссылок",
    description: "Самостоятельно открывать сервис вместо чужой формы.",
  },
  {
    id: "permissions",
    title: "Приложения и разрешения",
    description: "Оценить источник программы и объём доступа к устройству.",
  },
  {
    id: "pressure",
    title: "Срочность и секретность",
    description: "Сделать паузу и не подчиняться искусственному давлению.",
  },
  {
    id: "account",
    title: "Защита и восстановление аккаунта",
    description: "Проверить сеансы и защитить доступ после раскрытия.",
  },
  {
    id: "reality",
    title: "Настоящее и подозрительное",
    description:
      "Проверять факты без автоматического доверия или отказа от всего.",
  },
] as const;
export type SkillId = (typeof skills)[number]["id"];
export const skillIds = skills.map((s) => s.id);
export const skillName = (id: SkillId) =>
  skills.find((s) => s.id === id)!.title;
