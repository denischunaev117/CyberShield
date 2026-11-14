import type { Scenario, Step } from "./engine";

export type RecoveryKind =
  | "money"
  | "bank"
  | "account"
  | "device"
  | "privacy"
  | "contract"
  | "health"
  | "obligation"
  | "crypto"
  | "verification"
  | "trade";
const groups: Record<RecoveryKind, string[]> = {
  money: [
    "friend-account",
    "friend-real",
    "call-bank",
    "call-family-real",
    "tg-tasks",
    "tg-director",
    "wa-rental",
    "wa-return",
    "wa-friend-real",
    "invoice-switch",
    "refund-after-loss",
    "utility-debt",
    "rb-real-flat-fake-owner",
    "rb-building-goods",
    "game-pressure",
    "ozon-discount",
    "visa-guarantee",
    "enterprise-shares",
    "cottage-weekend",
    "car-deposit",
    "rented-car-sale",
    "hot-tour",
    "partner-package",
    "loan-insurance",
    "call-cash-inspection",
    "international-parcel-fee",
    "import-car-customs",
    "call-secret-operation",
    "call-relative-accident-real",
    "call-import-compensation",
    "brand-shop-clone",
    "wb-fake-credit",
    "job-wallet-deposit",
    "date-ticket-site",
    "car-import-advance",
    "telegram-car-rental",
    "blogger-prize-delivery",
    "senior-discount-pressure",
  ],
  bank: [
    "parcel-sms",
    "call-parcel-real",
    "wa-buyer",
    "courier-order-real",
    "rb-erip-fine",
    "rb-nfc-check",
    "rb-wallet-real",
    "call-pension",
    "survey-forwarding",
    "refund-form-after-order",
    "bank-survey-gift",
    "bank-telegram-bot",
    "flowers-order-real",
  ],
  account: [
    "call-mobile",
    "tg-vote",
    "rb-intercom",
    "rb-bills-bot",
    "rb-store-manager-real",
    "rb-store-api",
    "call-meter",
    "call-clinic-real",
    "tax-letter-link",
    "call-home-service-real",
    "premium-gift",
    "wb-partners-fake-support",
  ],
  device: [
    "protective-apk",
    "cloud-resume",
    "foreign-cloud-job",
    "holiday-card",
    "internship-qr",
    "game-cloud-account",
  ],
  privacy: [
    "scholarship-real",
    "tickets-real",
    "medical-appointment",
    "medical-card-update",
    "heating-compensation",
    "charity-consent-check",
    "charity-report-real",
    "private-message-pressure",
  ],
  contract: [
    "rb-registered-letter",
    "rb-card-rental",
    "rb-tour-booking",
    "rb-credit-phone",
    "kufar-proxy-post",
    "call-mirror-credit",
    "friend-business-real",
    "call-protect-property",
    "epasluga-money-courier",
    "car-installment-buyer",
  ],
  health: ["call-wonder-cure"],
  obligation: ["parking-qr", "call-tax-appointment-real", "property-tax-real"],
  trade: ["car-payment-proof", "phone-cash-courier"],
  crypto: [
    "fake-crypto-exchange",
    "crypto-triangle",
    "crypto-help-screen",
    "crypto-mentor-access",
    "crypto-legality-link",
  ],
  verification: ["tg-charity-real", "tech-discount-real"],
};
export const recoveryKinds = new Map<string, RecoveryKind>(
  Object.entries(groups).flatMap(([kind, ids]) =>
    ids.map((id) => [id, kind as RecoveryKind] as const),
  ),
);

const actions: Record<RecoveryKind, string[]> = {
  crypto: [
    "Не отправляйте активы или комиссии ради «вывода», «разблокировки» и проверки законности. Запись операции не подтверждает полномочия получателя или обещание возврата.",
    "С доверенного устройства защитите аккаунт, завершите чужие сеансы и отзовите раскрытые API-ключи или разрешения через официальные средства сервиса. Не сообщайте фразу восстановления кошелька.",
    "Сохраните идентификаторы операций и переписку. Обратитесь в официальную поддержку сервиса и при хищении в милицию; если платили через банк, сообщите и банку. Подтверждённый перевод в сети обычно нельзя отменить, гарантированный возврат обещать нельзя.",
  ],
  verification: [
    "Перед решением или пересылкой проверьте обращение независимо. Знакомое имя, настоящая организация и часть правдивых фактов не подтверждают все условия предложения.",
    "Отдельно сверьте условия, получателя и назначение действия. Отказ или пауза допустимы, пока факты не проверены.",
    "Если уже переслали сообщение без проверки, предупредите получателей. Если раскрыты личные сведения или отправлены деньги, отдельно разберите эти последствия через официальный сервис или банк.",
  ],
  money: [
    "Прекратите новые переводы. Не оплачивайте «возврат», «разблокировку» или обещание закрыть проверку.",
    "Если деньги отправлены мошеннику, сразу свяжитесь с банком по официальному номеру или через приложение. Уточните, можно ли остановить или оспорить операцию. Возврат не гарантирован.",
    "Сохраните сообщения, реквизиты и подтверждения платежей. При хищении обратитесь в милицию; при непосредственной угрозе — 102.",
    "Если раскрыты коды, пароли или документы, отдельно защитите затронутый доступ через официальный сервис. Об утечке рабочих сведений сообщите проверенному ответственному в своей организации.",
  ],
  bank: [
    "Не сообщайте новых кодов и не подтверждайте незнакомые операции.",
    "Если раскрыты данные карты или банковского входа, немедленно свяжитесь с банком через официальный канал. Уточните блокировку карты или доступа и проверьте операции.",
    "Сохраните уведомления и переписку. Если есть чужие списания, сообщите банку и обратитесь в милицию. Удаление чата не защищает раскрытые данные.",
  ],
  account: [
    "Прекратите передачу кодов, паролей, токенов и новых разрешений.",
    "Через самостоятельно открытое приложение или официальный сайт завершите чужие сеансы, смените раскрытый пароль, отзовите ненужные права или ключи. Включите двухэтапную защиту, если она доступна.",
    "Проверьте действия в аккаунте и предупредите затронутых людей. Если раскрыт банковский доступ или отправлены деньги, отдельно немедленно свяжитесь с банком.",
  ],
  device: [
    "Прекратите демонстрацию экрана и выдачу разрешений. Не открывайте банк и не вводите пароли на устройстве, доступ к которому мог получить посторонний.",
    "С другого доверенного устройства защитите затронутые аккаунты. За восстановлением устройства обращайтесь в официальную поддержку или к проверенному специалисту; сохраните подтверждение владения.",
    "Не платите за обещание снять блокировку. Если затронуты платежи или банковский доступ, сразу свяжитесь с банком.",
  ],
  privacy: [
    "Остановите передачу документов, кодов и личных материалов. Не публикуйте их в общем доступе ради проверки или защиты от угроз.",
    "Если сведения уже раскрыты, ограничьте доступ, обратитесь к получателю или платформе с просьбой удалить публикацию и сохраните доказательства. Это не гарантирует удаления всех копий.",
    "При угрозах получите поддержку доверенного человека и обратитесь в милицию. Если раскрыт доступ к аккаунту или счёту, дополнительно защитите его через официальный сервис или банк.",
  ],
  contract: [
    "Остановитесь до новых подписей, передачи имущества и движения чужих средств.",
    "Проверьте, какие договоры, полномочия и обязательства уже возникли. Если договор подписан или имущество передано, зафиксируйте факты и получите независимую юридическую консультацию.",
    "При участии счёта или кредита немедленно обратитесь в банк по официальному каналу. Не пытайтесь вернуть потери новыми переводами или силой; сохраните документы и при признаках хищения обратитесь в милицию.",
  ],
  health: [
    "Не меняйте назначенное лечение под давлением продавца. Обсудите медицинские решения с квалифицированным врачом.",
    "Прекратите дополнительные платежи за обещание гарантированного результата. Сохраните условия, рекламу, чеки и переписку.",
    "Если товар или услуга не соответствуют условиям, обратитесь к продавцу по проверенному контакту и за консультацией по защите прав потребителей. При ухудшении самочувствия нужна медицинская помощь.",
  ],
  obligation: [
    "Проверьте сам вопрос через независимо открытый официальный канал: подозрительное сообщение не отменяет реальный платёж или обязанность.",
    "Сверьте назначение, условия, сумму, срок и получателя. Если уже подтвердили подписку или платёж, проверьте последствия и порядок отмены у соответствующего сервиса или банка.",
    "Сохраните условия и результаты проверки. Не считайте закрытие страницы подтверждением отмены операции или исполнения обязанности.",
  ],
  trade: [
    "Проверьте фактическое поступление и полноту оплаты, полномочия сторон и условия передачи. Скриншот, расписка курьера или обещание не подтверждают расчёт.",
    "Если деньги или вещь уже переданы, сохраните договор, объявление, переписку и подтверждения расчёта. Получите независимую правовую помощь; при признаках хищения обратитесь в милицию.",
    "Не переводите новую сумму ради исправления расчёта. Не передавайте подозрительные купюры другим людям и не пытайтесь вернуть имущество силой.",
  ],
};

export function assessDebrief(s: Scenario, endingId: string, steps: Step[]) {
  const ending = s.endings[endingId];
  if (!ending) throw new Error("Неизвестный итог сценария");
  const mistakes = steps.flatMap((step, index) =>
    step.choice.assessment === "risk"
      ? [
          {
            ...step,
            number: index + 1,
            alternatives: s.nodes[step.node].choices.filter(
              (c) => c.assessment === "safe",
            ),
          },
        ]
      : [],
  );
  const incomplete = steps.flatMap((step, index) =>
    step.choice.assessment === "caution"
      ? [
          {
            ...step,
            number: index + 1,
            alternatives: s.nodes[step.node].choices.filter(
              (c) => c.assessment === "safe",
            ),
          },
        ]
      : [],
  );
  const tone =
    ending.outcome === "risk" ||
    (ending.outcome === "caution" && mistakes.length > 0)
      ? "danger"
      : ending.outcome === "caution" || mistakes.length > 0
        ? "warning"
        : "success";
  const label =
    ending.outcome === "risk"
      ? "Допущена серьёзная ошибка"
      : ending.outcome === "caution" && mistakes.length
        ? "Вы допустили ошибку. Проверьте последствия"
        : ending.outcome === "caution"
          ? "Проверка или решение требуют внимания"
          : mistakes.length
            ? "Вы остановились вовремя, но опасный шаг был"
            : "Вы завершили ситуацию безопасно";
  const kind = recoveryKinds.get(s.id);
  if (!kind) throw new Error(`Нет рекомендаций для сценария: ${s.id}`);
  return {
    tone,
    label,
    mistakes,
    incomplete,
    actions: actions[kind],
    needsReview: tone !== "success",
  };
}
