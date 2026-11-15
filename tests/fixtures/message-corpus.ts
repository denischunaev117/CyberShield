// Fictional, de-identified variations drawn from the supplied source themes.
export const suspiciousMessages: {
  source: string;
  text: string;
  expected: string[];
}[] = [
  {
    source: "alfabank",
    text: "Привет, выручишь до завтра?",
    expected: ["friendly-loan"],
  },
  {
    source: "alfabank",
    text: "Одолжи 150 рублей до зарплаты, верну в пятницу.",
    expected: ["friendly-loan"],
  },
  {
    source: "priorbank",
    text: "Можешь занять немного? Моя карта пока не готова.",
    expected: ["friendly-loan"],
  },
  {
    source: "alfabank",
    text: "Мне нужно 200 BYN, помоги, не звони.",
    expected: ["friendly-loan", "secrecy"],
  },
  {
    source: "priorbank",
    text: "Скинь на карту, я сейчас всё верну.",
    expected: ["unexpected-payment"],
  },
  {
    source: "belinvestbank",
    text: "Скинь код из смс.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Код входа жду в ответном сообщении.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Пароль перешли мне, пожалуйста.",
    expected: ["secret-request"],
  },
  {
    source: "belarusbank",
    text: "Не сообщайте код никому, кроме нашего сотрудника.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Никому не сообщайте код. Теперь назовите код мне.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Сейчас придёт код. Отправь его мне для проверки.",
    expected: ["secret-request"],
  },
  {
    source: "belinvestbank",
    text: "Назовите последние четыре цифры входящего звонка.",
    expected: ["call-digits"],
  },
  {
    source: "belinvestbank",
    text: "Напиши последние 6 цифр номера входящего звонка.",
    expected: ["call-digits"],
  },
  {
    source: "belinvestbank",
    text: "Скинь скрин сообщения, которое сейчас придёт.",
    expected: ["call-digits"],
  },
  {
    source: "belinvestbank",
    text: "Продиктуйте цифры из уведомления.",
    expected: ["call-digits"],
  },
  {
    source: "alfabank",
    text: "Ваши средства необходимо задекларировать.",
    expected: ["declaration"],
  },
  {
    source: "alfabank",
    text: "Вы участвуете в спецоперации банка.",
    expected: ["declaration"],
  },
  {
    source: "tax",
    text: "Оформите встречный кредит для отмены чужой заявки.",
    expected: ["loan-instruction"],
  },
  {
    source: "tax",
    text: "Нужно взять кредит на максимальную сумму.",
    expected: ["loan-instruction"],
  },
  {
    source: "alfabank",
    text: "Переведите сбережения на страховой счет.",
    expected: ["third-party-payee"],
  },
  {
    source: "belinvestbank",
    text: "Для сохранности переведите деньги на резервный счёт.",
    expected: ["unexpected-payment", "third-party-payee"],
  },
  {
    source: "mvd",
    text: "Мама, я в беде. Наличные заберёт курьер.",
    expected: ["cash-courier"],
  },
  {
    source: "alfabank",
    text: "Передайте наличные нашему представителю для проверки.",
    expected: ["cash-courier"],
  },
  {
    source: "belinvestbank",
    text: "Скажите кассиру, что деньги на ремонт.",
    expected: ["secrecy"],
  },
  {
    source: "alfabank",
    text: "Я ваш директор. Проведи оплату, договор пришлю позже.",
    expected: ["claimed-authority", "fake-manager"],
  },
  {
    source: "alfabank",
    text: "Какой сейчас остаток на расчетном счете?",
    expected: ["fake-manager"],
  },
  {
    source: "alfabank",
    text: "Договор позже, сейчас проведи оплату.",
    expected: ["fake-manager"],
  },
  {
    source: "priorbank",
    text: "Пройдите опрос и получите вознаграждение.",
    expected: ["paid-survey"],
  },
  {
    source: "alfabank",
    text: "Вам положена социальная выплата, заполните анкету.",
    expected: ["compensation-bait"],
  },
  {
    source: "alfabank",
    text: "Получите компенсацию за утечку данных.",
    expected: ["compensation-bait"],
  },
  {
    source: "alfabank",
    text: "Ваш штраф: сегодня последний день оплаты, иначе арест.",
    expected: ["urgency", "threat"],
  },
  {
    source: "priorbank",
    text: "Посылка задержана, уточните адрес по ссылке.",
    expected: ["contract-renewal", "unverified-link"],
  },
  {
    source: "tax",
    text: "Продлите договор мобильной связи, иначе номер отключат.",
    expected: ["contract-renewal"],
  },
  {
    source: "belinvestbank",
    text: "Для замены домофона подтвердите заявку.",
    expected: ["contract-renewal"],
  },
  {
    source: "alfabank",
    text: "Отсканируйте QR для голосования.",
    expected: ["qr-action"],
  },
  {
    source: "alfabank",
    text: "Пройдите по куар коду для получения приза.",
    expected: ["qr-action"],
  },
  {
    source: "telegram",
    text: "Проголосуй за племянницу в конкурсе, ей не хватает одного голоса.",
    expected: ["voting-login"],
  },
  {
    source: "telegram",
    text: "Забери бесплатный Telegram Premium.",
    expected: ["voting-login"],
  },
  {
    source: "priorbank",
    text: "Я оплатил товар. Получите деньги по ссылке.",
    expected: ["buyer-receive", "unverified-link"],
  },
  {
    source: "belinvestbank",
    text: "Для зачисления укажите CVV и срок действия карты.",
    expected: ["card-details"],
  },
  {
    source: "belarusbank",
    text: "Пришли фото обеих сторон карты.",
    expected: ["card-details"],
  },
  {
    source: "belarusbank",
    text: "Какой остаток на карте?",
    expected: ["card-details"],
  },
  {
    source: "alfabank",
    text: "Для возврата оплатите комиссию.",
    expected: ["refund-fee"],
  },
  {
    source: "priorbank",
    text: "Вывод заработка возможен после страхового взноса.",
    expected: ["refund-fee"],
  },
  {
    source: "alfabank",
    text: "Подарок уже отправил, оплати таможенный сбор.",
    expected: ["romance-bait"],
  },
  {
    source: "alfabank",
    text: "На свидание купи билеты по моей ссылке.",
    expected: ["romance-bait"],
  },
  {
    source: "priorbank",
    text: "Принимайте переводы на свою карту, ваш процент 10%.",
    expected: ["money-mule"],
  },
  {
    source: "tax",
    text: "Возьмём карту в аренду, платим каждый день.",
    expected: ["money-mule"],
  },
  {
    source: "alfabank",
    text: "Робот торгует криптовалютой за вас.",
    expected: ["investment-trap"],
  },
  {
    source: "alfabank",
    text: "Вложи 100 BYN, получишь 1000.",
    expected: ["investment-trap"],
  },
  {
    source: "priorbank",
    text: "Доход 20% ежедневно.",
    expected: ["investment-trap"],
  },
  {
    source: "priorbank",
    text: "Только полная предоплата.",
    expected: ["prepayment"],
  },
  {
    source: "alfabank",
    text: "Для брони внесите задаток.",
    expected: ["prepayment"],
  },
  {
    source: "priorbank",
    text: "Чтобы начать работу, оплатите обучение.",
    expected: ["prepayment"],
  },
  {
    source: "apple",
    text: "Войди в мой iCloud для проверки телефона.",
    expected: ["account-takeover"],
  },
  {
    source: "apple",
    text: "Выйдите из своего Apple Account, сейчас проверим телефон.",
    expected: ["account-takeover"],
  },
  {
    source: "telegram",
    text: "Подтверди вход нового устройства.",
    expected: ["account-takeover"],
  },
  {
    source: "apple",
    text: "Зафиксирован вход с нового устройства.",
    expected: ["account-alarm"],
  },
  {
    source: "alfabank",
    text: "На ваше имя оформляют кредит.",
    expected: ["account-alarm"],
  },
  {
    source: "priorbank",
    text: "Включите демонстрацию экрана.",
    expected: ["screen-sharing"],
  },
  {
    source: "alfabank",
    text: "Разрешите доступ к уведомлениям.",
    expected: ["screen-sharing"],
  },
  {
    source: "priorbank",
    text: "Откройте специальные возможности для поддержки.",
    expected: ["screen-sharing"],
  },
  {
    source: "alfabank",
    text: "Приложите банковскую карту к телефону для защиты.",
    expected: ["nfc-card"],
  },
  {
    source: "priorbank",
    text: "Включите NFC и поднесите карту.",
    expected: ["nfc-card"],
  },
  {
    source: "alfabank",
    text: "Отключите антивирус для установки.",
    expected: ["security-disable"],
  },
  {
    source: "belarusbank",
    text: "Выключите уведомления банка.",
    expected: ["security-disable"],
  },
  {
    source: "alfabank",
    text: "Распакуйте архив с ответами на ЦТ.",
    expected: ["dangerous-file"],
  },
  {
    source: "mvd",
    text: "Откройте договор.exe.",
    expected: ["dangerous-file"],
  },
  {
    source: "apple",
    text: "Скачайте обновление по ссылке.",
    expected: ["dangerous-file", "unverified-link"],
  },
  {
    source: "priorbank",
    text: "Вернём украденные деньги, сначала оплатите услуги.",
    expected: ["recovery-promise"],
  },
  {
    source: "priorbank",
    text: "Уточните паспортные данные.",
    expected: ["identity-documents"],
  },
  {
    source: "apple",
    text: "Войдите на bank-check.by/receive для получения перевода.",
    expected: ["unverified-link"],
  },
  {
    source: "apple",
    text: "Откройте pay-check.бел/оплата.",
    expected: ["unverified-link"],
  },
  {
    source: "telegram",
    text: "Скинь к о д из с м с.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Пришли к\u200bод из SMS.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "Скинь кoд из cмc.",
    expected: ["secret-request"],
  },
  {
    source: "telegram",
    text: "ПРИШЛИ КОД ИЗ СМС",
    expected: ["secret-request"],
  },
  {
    source: "priorbank",
    text: "Переведи 50 BYN сегодня.",
    expected: ["unexpected-payment"],
  },
  {
    source: "alfabank",
    text: "Пришлите цифры из SMS для подтверждения доставки.",
    expected: ["secret-request", "call-digits"],
  },
  {
    source: "apple",
    text: "Поддержка: скачайте приложение для защиты телефона.",
    expected: ["device-control"],
  },
];
export const neutralMessages = [
  "Встречаемся завтра у входа в библиотеку.",
  "Привет! Как дела? Давно не виделись.",
  "Занятие начинается в десять утра.",
  "Прочитайте третью главу к завтрашнему уроку.",
  "Ваш код для собственной операции. Никому не сообщайте код из SMS.",
  "Для своей операции откройте официальное приложение. Никому не сообщайте код из SMS.",
  "Код из SMS никому не отправляйте.",
  "Никогда не передавайте пароль другим людям.",
  "Мы не просим вас присылать код из SMS.",
  "Не отправляйте деньги незнакомым людям.",
  "Не включайте демонстрацию экрана.",
  "Не вводите пароль по присланной ссылке.",
  "Не отключайте антивирус.",
  "Не сообщайте последние цифры входящего звонка.",
  "Где ты припарковался? Я уже у входа.",
  "Спасибо, получил вашу книгу. Верну в выходные.",
  "Пароль никому не передавайте, даже знакомым.",
  "Нельзя сообщать пароль посторонним.",
  "Друзья, никому не показывайте банковский код.",
  "Вчера ходили в музей, завтра идём в парк.",
  "Не устанавливайте AnyDesk по просьбе незнакомца.",
  "Никому не сообщайте код, в том числе сотрудникам банка.",
  "Мы никогда не просим присылать пароль.",
  "Не присылайте фото паспорта незнакомцу.",
  "Нельзя передавать пароль другим людям.",
  "Не надо включать доступ к уведомлениям.",
];
