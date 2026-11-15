import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  Send,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { storyProblem, storyRecipient, submitStory } from "../story-submission";

export default function ShareStory() {
  const [story, setStory] = useState("");
  const [channel, setChannel] = useState("Не уточняю");
  const [honey, setHoney] = useState("");
  const [review, setReview] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<
    "editing" | "sending" | "accepted" | "activation-required"
  >("editing");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const focus = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  useEffect(() => {
    if (review || status === "accepted") focus.current?.focus();
  }, [review, status]);
  async function send() {
    if (!consent || status === "sending" || controller.current) return;
    const problem = storyProblem(story);
    if (problem) {
      setError(problem);
      return;
    }
    setStatus("sending");
    setError("");
    const request = new AbortController();
    controller.current = request;
    const timer = window.setTimeout(() => request.abort(), 25000);
    try {
      const result = await submitStory(story, channel, honey, request.signal);
      setStatus(result);
      if (result === "accepted") {
        setStory("");
        setConsent(false);
      }
    } catch {
      if (controller.current === request) {
        setStatus("editing");
        setError(
          "Отправка не подтверждена. Проверьте соединение и попробуйте позже. Текст истории сохранён на экране.",
        );
      }
    } finally {
      window.clearTimeout(timer);
      if (controller.current === request) controller.current = null;
    }
  }
  return (
    <section className="share-story">
      <div className="eyebrow">ВАШ ОПЫТ МОЖЕТ ПОМОЧЬ ДРУГИМ</div>
      <h1>Поделитесь историей</h1>
      <p className="page-intro">
        Расскажите, с какой ситуацией столкнулись. Команда КиберЩита рассмотрит
        историю и сможет превратить её в новый учебный сценарий.
      </p>
      {status === "accepted" ? (
        <div className="submission-success" role="status">
          <ShieldCheck size={40} />
          <h2 ref={focus} tabIndex={-1}>
            История передана в обработку
          </h2>
          <p>
            Сервис FormSubmit подтвердил приём заявки для отправки команде.
            Спасибо за вклад в КиберЩит. Публикация сценария не гарантируется:
            сначала история проходит рассмотрение и учебную адаптацию.
          </p>
          <button
            className="primary"
            onClick={() => {
              setStatus("editing");
              setReview(false);
            }}
          >
            Рассказать ещё одну историю
          </button>
        </div>
      ) : (
        <>
          <aside
            className="privacy-notice"
            aria-label="Правила безопасности истории"
          >
            <LockKeyhole size={27} />
            <div>
              <h2>Только история. Без персональных данных.</h2>
              <p>
                Не указывайте свои или чужие ФИО, телефоны, почту, адреса, место
                работы и другие сведения, по которым можно узнать человека. Не
                вставляйте номера карт, счетов и документов, коды, пароли,
                ссылки на профили или переписки.
              </p>
              <p>
                Используйте роли: «знакомый», «продавец», «сотрудник банка».
                Суммы и время можно округлить. Скриншоты и документы
                прикладывать не нужно.
              </p>
              <b>
                Это предложение для учебного сценария, а не заявление в милицию
                или служба срочной помощи.
              </b>
            </div>
          </aside>
          {review ? (
            <div className="story-review">
              <h2 ref={focus} tabIndex={-1}>
                Проверьте историю перед отправкой
              </h2>
              <p>
                <b>Канал: </b>
                {channel}
              </p>
              <div className="story-preview">
                <FileText size={23} />
                <p data-i18n="off">{story}</p>
              </div>
              <label className="story-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Подтверждаю: я убрал персональные данные, контакты, реквизиты,
                  коды и другие сведения, по которым можно узнать меня или
                  других людей. Историю можно рассмотреть для учебного сценария.
                </span>
              </label>
              <p className="submission-provider">
                Получатель: {storyRecipient}. Отправка идёт через{" "}
                <a
                  href="https://formsubmit.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FormSubmit
                </a>
                : этот сторонний сервис получает текст и технические данные
                запроса, включая IP-адрес. Поля имени и почты отправителя здесь
                не собираются.
              </p>
              {status === "activation-required" && (
                <div className="form-error" role="alert">
                  <TriangleAlert size={22} />
                  <p>
                    Сервис просит подтвердить адрес получателя. Команде нужно
                    активировать форму по письму FormSubmit. Доставка вашей
                    истории пока не подтверждена; текст остаётся на экране.
                  </p>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="story-actions">
                <button
                  className="secondary"
                  disabled={status === "sending"}
                  onClick={() => {
                    setReview(false);
                    setConsent(false);
                    setError("");
                    setStatus("editing");
                  }}
                >
                  <ArrowLeft size={19} />
                  Исправить текст
                </button>
                <button
                  className="primary"
                  disabled={!consent || status === "sending"}
                  onClick={send}
                >
                  {status === "sending" ? "Отправляем…" : "Отправить историю"}
                  <Send size={20} />
                </button>
              </div>
            </div>
          ) : (
            <form
              className="story-form"
              onSubmit={(e) => {
                e.preventDefault();
                const problem = storyProblem(story);
                setError(problem || "");
                if (!problem) {
                  setReview(true);
                  setConsent(false);
                }
              }}
            >
              <label htmlFor="story-channel">
                Где произошло обращение{" "}
                <span className="quiet">— можно не уточнять</span>
              </label>
              <select
                id="story-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                {[
                  "Не уточняю",
                  "Телефонный звонок",
                  "SMS",
                  "Viber",
                  "Telegram",
                  "WhatsApp",
                  "Instagram",
                  "Электронная почта",
                  "Объявление или сайт",
                  "При личной встрече",
                  "Другое",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <label htmlFor="story-text">Ваша история</label>
              <p id="story-help">
                Как всё началось? Кем представился человек, что предложил или
                потребовал? Что вы сделали и чем всё закончилось? Напишите
                своими словами, без имён и точных деталей личности.
              </p>
              <textarea
                id="story-text"
                value={story}
                onChange={(e) => {
                  setStory(e.target.value);
                  setError("");
                }}
                minLength={80}
                maxLength={6000}
                required
                aria-describedby={`story-help story-counter${error ? " story-error" : ""}`}
                aria-invalid={Boolean(error)}
                placeholder="Например: в мессенджере знакомый попросил одолжить деньги. Я решил проверить просьбу другим способом…"
              />
              <p id="story-counter" className="story-counter">
                {story.length} / 6000 символов · минимум 80
              </p>
              <label className="honey-field" aria-hidden="true">
                Website
                <input
                  name="website"
                  value={honey}
                  onChange={(e) => setHoney(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
              {error && (
                <p id="story-error" className="form-error" role="alert">
                  {error}
                </p>
              )}
              <p className="story-guidance">
                <Check size={19} />
                Перед отправкой вы увидите весь текст и сможете убрать лишнее.
                Черновик не сохраняется после закрытия этого раздела.
              </p>
              <button className="primary" type="submit">
                Проверить историю
                <ArrowRight size={20} />
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
