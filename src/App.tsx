import { recordLearningStat } from "./platform/learning-stats";
import Navigation from "./components/Navigation";
import FeatureRouter, { warmLocalTools } from "./features/FeatureRouter";
import {
  pageNames,
  type PageId,
  type FeaturePage,
  type ScenarioCompletion,
} from "./features/types";
import CollectionsPage from "./components/CollectionsPage";
import ShareStory from "./components/ShareStory";
import {
  DebriefAssessment,
  OutcomeStatus,
} from "./components/DebriefAssessment";
import {
  readPreferences,
  savePreferences,
  applyPreferences,
} from "./platform/preferences";
import { scenarioAudience } from "./content/audiences";
import type { CompletionDetails } from "./collection-engine";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Camera,
  Ellipsis,
  GraduationCap,
  Heart,
  LayoutGrid,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquare,
  Moon,
  Sun,
  Package,
  Phone,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { EvidenceCard } from "./components/EvidenceCard";
import { CallScene } from "./components/CallScene";
import { scenarios } from "./content/scenarios";
import {
  advance,
  sceneIdentity,
  scenarioChannels,
  type Scenario,
  type Step,
} from "./engine";

import { progressStore } from "./platform/progress";
function readProgress() {
  return progressStore.read(new Set(scenarios.map((s) => s.id)));
}
const topicNames = ["Все ситуации", ...new Set(scenarios.map((s) => s.topic))];
const channelNames: Record<Scenario["channel"], string> = {
  viber: "Viber",
  sms: "SMS",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  call: "Звонок",
  email: "Почта",
  web: "Сайт",
  instagram: "Instagram",
};
function ChannelIcon({
  channel,
  size = 18,
}: {
  channel: string;
  size?: number;
}) {
  return channel === "instagram" ? (
    <Camera size={size} />
  ) : channel === "email" ? (
    <Mail size={size} />
  ) : channel === "call" ? (
    <Phone size={size} />
  ) : channel === "sms" ? (
    <MessageSquare size={size} />
  ) : (
    <MessageCircle size={size} />
  );
}

function PhoneArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="art-spark spark-one">✦</div>
      <div className="art-spark spark-two">✦</div>
      <div className="illustrated-phone">
        <div className="phone-top">
          <span>19:41</span>
          <div className="island" />
          <span>▰</span>
        </div>
        <div className="mock-contact">
          <div className="mini-avatar">А</div>
          <div>
            <b>Андрей</b>
            <small>сообщение в Viber</small>
          </div>
          <Phone size={19} />
        </div>
        <div className="mock-bubble">
          Привет! Выручишь?
          <br />
          Нужно 150 рублей до завтра.<small>19:41</small>
        </div>
        <div className="mock-reply">
          Сначала позвоню тебе.
          <small>
            19:42 <CheckCheck size={14} />
          </small>
        </div>
        <div className="phone-bottom" />
      </div>
      <div className="floating-shield">
        <ShieldCheck size={48} strokeWidth={1.5} />
      </div>
      <div className="verified-note">
        <span>
          <Check size={20} />
        </span>
        <div>
          <b>Пауза. Проверка. Решение.</b>
          <small>Хорошая привычка на каждый день</small>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>(() =>
    new URLSearchParams(location.search).has("lesson")
      ? "classroom"
      : "practice",
  );
  const [activityCompletion, setActivityCompletion] = useState<
    ScenarioCompletion | undefined
  >();
  const [topic, setTopic] = useState("Все ситуации");
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyBelarus, setOnlyBelarus] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [preferencesNotice, setPreferencesNotice] = useState(false);
  const [settings, setSettings] = useState(false);
  const [active, setActive] = useState<Scenario | null>(null);
  const [progress, setProgress] = useState(readProgress);
  const [storageNotice, setStorageNotice] = useState(false);
  const catalog = useRef<HTMLElement>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const load = () => {
      void warmLocalTools().then((results) => {
        if (results.every((r) => r.status === "fulfilled"))
          document.documentElement.dataset.localTools = "ready";
      });
    };
    const timer = setTimeout(load, 1800);
    window.addEventListener("online", load);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", load);
    };
  }, []);
  useEffect(() => {
    applyPreferences(preferences);
    setPreferencesNotice(!savePreferences(preferences));
  }, [preferences]);
  useEffect(() => {
    if (settings) settingsDialog.current?.showModal();
    else settingsDialog.current?.close();
  }, [settings]);
  const completed = new Set(progress.map((p) => p.id)).size;
  const filtered = scenarios.filter(
    (s) =>
      (!onlyBelarus || s.source?.document === "belarus-2026") &&
      (topic === "Все ситуации" || topic === s.topic) &&
      (channel === "all" || scenarioChannels(s).some((c) => c === channel)) &&
      `${s.title} ${s.description} ${s.topic}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function navigate(next: PageId) {
    setPage(next);
    if (next !== "classroom") {
      const u = new URL(location.href);
      if (u.searchParams.has("lesson")) {
        u.searchParams.delete("lesson");
        history.replaceState(null, "", u);
      }
    }
  }
  function saveResult(
    s: Scenario,
    outcome: "safe" | "caution" | "risk",
    details?: CompletionDetails,
  ) {
    if (details && !recordLearningStat(s.id, outcome, details))
      setStorageNotice(true);
    setProgress((previous) => {
      const next = [
        ...previous,
        { id: s.id, outcome, completedAt: new Date().toISOString() },
      ];
      if (!progressStore.write(next)) setStorageNotice(true);
      return next;
    });
  }
  return (
    <div className={`app ${preferences.lowVision ? "low-vision" : ""}`}>
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <Navigation
        page={page}
        onNavigate={navigate}
        onSettings={() => setSettings(true)}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-parent">
              Моё пространство <ChevronRight size={18} />
            </span>
            <span>{pageNames[page]}</span>
          </div>
          <div className="header-right">
            <button
              className="theme-toggle"
              role="switch"
              aria-label="Тёмная тема"
              aria-checked={preferences.theme === "dark"}
              onClick={() =>
                setPreferences((p) => ({
                  ...p,
                  theme: p.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              <Sun size={25} />
              <span className="theme-track">
                <span />
              </span>
              <Moon size={25} />
              <span className="theme-name">
                {preferences.theme === "dark" ? "Тёмная" : "Светлая"}
              </span>
            </button>
            <span className="private-label">
              <LockKeyhole size={18} />
              Без регистрации
            </span>
            <button
              className="profile"
              title="Настройки удобства"
              aria-label="О приложении и настройках"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={24} />
            </button>
          </div>
        </header>
        <main id="main">
          {page === "practice" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    МАЛЕНЬКИЕ ШАГИ К БОЛЬШОЙ УВЕРЕННОСТИ
                  </div>
                  <h1>Спокойствие начинается с практики</h1>
                  <p>
                    Учитесь распознавать обман в ситуациях, знакомых каждому.
                  </p>
                </div>
                <span className="edition">
                  <span />
                  Ранняя версия
                </span>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <ShieldCheck size={19} />
                    Реальные ситуации. Без реального риска.
                  </span>
                  <h2>
                    Лучше разобраться здесь.
                    <br />
                    <em>Чем растеряться в жизни.</em>
                  </h2>
                  <p>
                    Сообщение от друга, звонок из банка или SMS о посылке.
                    <br className="desktop-break" /> Попробуйте разные решения и
                    узнайте, что за ними стоит.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setActive(scenarios[0])}
                  >
                    Попробовать ситуацию <ArrowRight size={22} />
                  </button>
                  <div className="hero-footer">
                    <Clock3 size={18} />
                    От 3 минут <span />
                    Можно остановиться в любой момент
                  </div>
                </div>
                <PhoneArt />
              </section>
              <section
                className="principles"
                aria-label="Как устроена практика"
              >
                <div>
                  <span className="principle-icon">
                    <MessageCircle />
                  </span>
                  <p>
                    <b>Как в повседневной жизни</b>
                    <small>Знакомые переписки и уведомления</small>
                  </p>
                </div>
                <div>
                  <span className="principle-icon">
                    <Users />
                  </span>
                  <p>
                    <b>Не всегда мошенники</b>
                    <small>Учимся проверять, а не подозревать всех</small>
                  </p>
                </div>
                <div>
                  <span className="principle-icon">
                    <GraduationCap />
                  </span>
                  <p>
                    <b>Понятный разбор решений</b>
                    <small>Что заметить и как действовать дальше</small>
                  </p>
                </div>
              </section>
              <section className="catalog" ref={catalog}>
                <div className="section-title">
                  <div>
                    <div className="eyebrow">ПРАКТИКА НА КАЖДЫЙ ДЕНЬ</div>
                    <h2>С какой ситуации начнём?</h2>
                  </div>
                  <span className="scenario-count">
                    Доступно сценариев: {scenarios.length}
                  </span>
                </div>
                <div className="collection-banner">
                  <span className="collection-symbol">
                    <BookOpen size={28} />
                  </span>
                  <div>
                    <span>НОВАЯ ПОДБОРКА</span>
                    <h3>Ситуации рядом: Беларусь</h3>
                    <p>
                      Домовой чат, ЕРИП, заказное письмо и другие знакомые
                      обстоятельства.
                    </p>
                  </div>
                  <button
                    aria-pressed={onlyBelarus}
                    className={
                      onlyBelarus
                        ? "collection-toggle active"
                        : "collection-toggle"
                    }
                    onClick={() => setOnlyBelarus(!onlyBelarus)}
                  >
                    {onlyBelarus ? "Показать все истории" : "Открыть подборку"}
                    <span>
                      {
                        scenarios.filter(
                          (s) => s.source?.document === "belarus-2026",
                        ).length
                      }
                    </span>
                  </button>
                </div>
                <div className="catalog-toolbar">
                  <div className="topic-tabs" aria-label="Темы">
                    {topicNames.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className={topic === t ? "active" : ""}
                        aria-pressed={topic === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={21} />
                    <input
                      aria-label="Поиск ситуаций"
                      placeholder="Найти ситуацию"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="channels">
                  <span>Формат</span>
                  {[
                    { id: "all", label: "Все форматы", icon: LayoutGrid },
                    { id: "viber", label: "Viber", icon: MessageCircle },
                    { id: "sms", label: "SMS", icon: MessageSquare },
                    { id: "telegram", label: "Telegram", icon: MessageCircle },
                    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                    { id: "call", label: "Звонки", icon: Phone },
                    { id: "email", label: "Почта", icon: Mail },
                    { id: "web", label: "Сайт", icon: LayoutGrid },
                    { id: "instagram", label: "Instagram", icon: Camera },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      className={channel === id ? "active" : ""}
                      key={id}
                      aria-pressed={channel === id}
                      onClick={() => setChannel(id)}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="scenario-grid">
                  {filtered.map((s, i) => (
                    <button
                      className={`scenario-card card-${s.channel} variant-${i}`}
                      key={s.id}
                      onClick={() => setActive(s)}
                    >
                      <div className="card-art">
                        <div className="channel-badge">
                          <ChannelIcon channel={s.channel} />
                          {scenarioChannels(s)
                            .map((c) => channelNames[c])
                            .join(" → ")}
                        </div>
                        <div className="scene-visual">
                          {s.channel === "call" ? (
                            <Phone size={68} strokeWidth={1.2} />
                          ) : s.channel === "email" ? (
                            <Mail size={68} strokeWidth={1.2} />
                          ) : s.channel === "web" ? (
                            <LayoutGrid size={68} strokeWidth={1.2} />
                          ) : s.channel === "sms" ? (
                            s.topic === "Посылки и доставка" ? (
                              <Package size={68} strokeWidth={1.2} />
                            ) : (
                              <MessageSquare size={68} strokeWidth={1.2} />
                            )
                          ) : (
                            <>
                              <div className="card-avatar">{s.avatar}</div>
                              <div className="tiny-message">
                                {s.channel === "viber"
                                  ? "Новое сообщение"
                                  : channelNames[s.channel]}
                                <span>
                                  сейчас <CheckCheck size={14} />
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <span className="art-number">
                          {String(scenarios.indexOf(s) + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="card-body">
                        <span className="card-topic">{s.topic}</span>
                        <h3>{s.title}</h3>
                        <span className="audience-tag">
                          <Users size={15} />
                          {scenarioAudience(s).label}
                        </span>
                        <p>{s.description}</p>
                        <div className="card-bottom">
                          <span>
                            <Clock3 size={18} />
                            {s.duration}
                          </span>
                          <span>
                            {progress.some((p) => p.id === s.id) ? (
                              <>
                                <Check size={18} />
                                Пройдено
                              </>
                            ) : (
                              s.difficulty
                            )}
                          </span>
                          <ArrowRight className="card-arrow" size={24} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {!filtered.length && (
                  <div className="empty-state">
                    <Search />
                    <h3>Таких ситуаций пока нет</h3>
                    <p>Попробуйте другой запрос или сбросьте фильтры.</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setQuery("");
                        setOnlyBelarus(false);
                        setTopic("Все ситуации");
                        setChannel("all");
                      }}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </section>
              <section className="roadmap-strip">
                <div className="roadmap-icon">
                  <Sparkles size={30} />
                </div>
                <div>
                  <h3>Больше жизненных ситуаций — впереди</h3>
                  <p>
                    В библиотеке уже 100 сценариев: звонки, письма, покупки и
                    общение с близкими.
                  </p>
                </div>
                <span>
                  Следующие этапы <ArrowDown size={19} />
                </span>
              </section>
              <div className="coming-topics">
                <span>
                  <Phone size={19} />
                  Больше голосовых историй
                </span>
                <span>
                  <Mail size={19} />
                  Электронные письма
                </span>
                <span>
                  <Shield size={19} />
                  Банки и платежи
                </span>
                <span>
                  <Package size={19} />
                  Покупки и объявления
                </span>
              </div>
            </>
          )}
          {page === "collections" && (
            <CollectionsPage
              renderScenario={(props) => (
                <Simulation
                  key={props.scenario.id}
                  {...props}
                  onComplete={(s, outcome, details) => {
                    saveResult(s, outcome, details);
                    props.onComplete(s, outcome, details);
                  }}
                />
              )}
            />
          )}
          {page === "guide" && (
            <section className="reading-page">
              <div className="eyebrow">МОЖНО ВЕРНУТЬСЯ В ЛЮБОЙ МОМЕНТ</div>
              <h1>Пауза. Проверка. Решение.</h1>
              <p className="page-intro">
                Осторожность — это привычка проверять обстоятельства и оставлять
                себе время.
              </p>
              {[
                [
                  "01",
                  "Не принимайте решение под давлением",
                  "Срочность и просьба сохранить всё в тайне — повод остановиться. Вы можете завершить разговор или отложить ответ.",
                ],
                [
                  "02",
                  "Свяжитесь другим способом",
                  "Позвоните близкому по сохранённому номеру. Контакты организации найдите самостоятельно на её официальном сайте или в приложении.",
                ],
                [
                  "03",
                  "Берегите коды и платёжные данные",
                  "Не сообщайте собеседнику коды из SMS, пароль или защитный код карты. Прочитайте, какую операцию подтверждает сообщение.",
                ],
                [
                  "04",
                  "Если уже передали данные или деньги",
                  "Немедленно свяжитесь с банком по официальному каналу, обсудите блокировку карты и спорную операцию. Смените раскрытые пароли, завершите посторонние сеансы. Сохраните сообщения и сведения об операции для обращения в милицию.",
                ],
              ].map(([n, t, p]) => (
                <article className="guide-item" key={n}>
                  <span>{n}</span>
                  <div>
                    <h2>{t}</h2>
                    <p>{p}</p>
                  </div>
                </article>
              ))}
              <p className="quiet">
                Учебная памятка. Она не гарантирует возврат средств и не
                заменяет помощь банка или правоохранительных органов.
              </p>
            </section>
          )}
          {page === "progress" && (
            <section className="reading-page">
              <div className="eyebrow">ВАШ ОПЫТ</div>
              <h1>Мой прогресс</h1>
              <p className="page-intro">
                Каждая разобранная ситуация — ещё один повод чувствовать себя
                увереннее.
              </p>
              <div className="progress-summary">
                <ShieldCheck size={50} />
                <div>
                  <strong>
                    {completed} из {scenarios.length}
                  </strong>
                  <p>доступных сценариев пройдено</p>
                </div>
              </div>
              <p className="quiet">
                Сохраняем только результат и дату в этом браузере. Тексты
                переписок не сохраняются.
              </p>
              {storageNotice && (
                <p role="status">
                  Браузер не разрешил сохранить прогресс. Результаты доступны до
                  закрытия страницы.
                </p>
              )}
              {progress.length === 0 ? (
                <div className="empty-state">
                  <BookOpen />
                  <h2>Здесь появится ваша практика</h2>
                  <p>Пройдите первую ситуацию и изучите разбор.</p>
                  <button
                    className="primary"
                    onClick={() => setPage("practice")}
                  >
                    Выбрать ситуацию <ArrowRight size={22} />
                  </button>
                </div>
              ) : (
                <div>
                  {[...progress].reverse().map((p, i) => (
                    <div className="progress-row" key={`${p.completedAt}-${i}`}>
                      <span
                        className={`principle-icon progress-outcome ${p.outcome}`}
                      >
                        {p.outcome === "risk" ? (
                          <ShieldX size={25} />
                        ) : p.outcome === "caution" ? (
                          <TriangleAlert size={25} />
                        ) : (
                          <Check size={25} />
                        )}
                      </span>
                      <div>
                        <b>{scenarios.find((s) => s.id === p.id)?.title}</b>
                        <small>
                          {new Date(p.completedAt).toLocaleDateString("ru-BY")}{" "}
                          ·{" "}
                          {p.outcome === "safe"
                            ? "Безопасное решение"
                            : p.outcome === "risk"
                              ? "Ошибка с последствиями — разберите и повторите"
                              : "Остались последствия или неполная проверка"}
                        </small>
                      </div>
                      <button
                        className="text-button"
                        onClick={() =>
                          setActive(scenarios.find((s) => s.id === p.id)!)
                        }
                      >
                        Повторить <ArrowRight size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {page === "share" && <ShareStory />}
          {[
            "emergency",
            "message-check",
            "references",
            "diagnostics",
            "classroom",
            "learning-plan",
          ].includes(page) && (
            <FeatureRouter
              page={page as FeaturePage}
              onNavigate={navigate}
              onOpenScenario={(id, complete) => {
                const story = scenarios.find((s) => s.id === id);
                if (story) {
                  setActivityCompletion(() => complete);
                  setActive(story);
                }
              }}
            />
          )}
          <footer className="footer">
            <span>
              <ShieldCheck size={19} />
              КиберЩит · Практика безопасных решений
            </span>
            <span>Учебные ситуации. Настоящая уверенность.</span>
          </footer>
        </main>
      </div>
      <dialog
        aria-label="Настройки удобства"
        ref={settingsDialog}
        className="settings-dialog"
        onCancel={() => setSettings(false)}
      >
        <button
          className="close-button"
          aria-label="Закрыть настройки"
          onClick={() => setSettings(false)}
        >
          <X />
        </button>
        <Settings2 className="dialog-icon" />
        <h2>Сделайте себе удобно</h2>
        <p>Выбранная тема и режим чтения сохраняются на этом устройстве.</p>
        <label className="setting-row">
          <span>
            <b>Версия для слабовидящих</b>
            <small>
              Увеличенный текст и кнопки, чёткие границы, высокий контраст и
              упрощённое оформление.
            </small>
          </span>
          <input
            type="checkbox"
            checked={preferences.lowVision}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, lowVision: e.target.checked }))
            }
          />
        </label>
        <p className="quiet">
          Контрастная версия работает и в светлой, и в тёмной теме. Обычный
          масштаб браузера также можно увеличивать.
        </p>
        {preferencesNotice && (
          <p role="status">
            Не удалось сохранить настройки. Они действуют в этой вкладке.
          </p>
        )}
        <p className="quiet">
          КиберЩит — учебное приложение для жителей Беларуси. Версия 2.1:{" "}
          {scenarios.length} сценариев, без регистрации.
        </p>
        <button className="primary" onClick={() => setSettings(false)}>
          Готово <Check size={21} />
        </button>
      </dialog>
      {active && (
        <Simulation
          scenario={active}
          returnLabel={
            page === "learning-plan"
              ? "К моему плану"
              : page === "classroom"
                ? "К занятию"
                : ["emergency", "message-check"].includes(page)
                  ? "К инструменту"
                  : undefined
          }
          onClose={() => {
            setActive(null);
            setActivityCompletion(undefined);
          }}
          onComplete={(s, outcome, details) => {
            saveResult(s, outcome, details);
            activityCompletion?.(s, outcome, details);
          }}
        />
      )}
    </div>
  );
}

function Simulation({
  scenario: s,
  onClose,
  onComplete,
  onNext,
  nextLabel,
  returnLabel,
}: {
  scenario: Scenario;
  onClose: () => void;
  onComplete: (
    s: Scenario,
    outcome: "safe" | "caution" | "risk",
    details: CompletionDetails,
  ) => void;
  onNext?: () => void;
  nextLabel?: string;
  returnLabel?: string;
}) {
  const [node, setNode] = useState(s.start);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stopped, setStopped] = useState(false);
  const [started, setStarted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const ending = s.endings[node];
  const current = s.nodes[node];
  const identity = current ? sceneIdentity(s, node) : null;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    transcript.current?.scrollTo({
      top: transcript.current.scrollHeight,
      behavior: "smooth",
    });
    if (ending || stopped) {
      heading.current?.focus({ preventScroll: true });
      dialog.current?.scrollTo({ top: 0 });
    }
  }, [node, ending, stopped]);
  function choose(id: string) {
    const c = advance(s, node, id);
    setSteps([...steps, { node, choice: c }]);
    setNode(c.next);
    if (s.endings[c.next]) {
      const counts = { safe: 0, caution: 0, risk: 0 };
      for (const step of [...steps, { node, choice: c }])
        counts[step.choice.assessment]++;
      onComplete(s, s.endings[c.next].outcome, { endingId: c.next, counts });
    }
  }
  function restart() {
    setNode(s.start);
    setSteps([]);
    setStopped(false);
    setStarted(false);
  }
  return (
    <dialog
      aria-label={`${s.title} — учебная симуляция`}
      className="simulation-dialog"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (ending || stopped || !started) onClose();
        else setStopped(true);
      }}
    >
      <div className="simulation-top">
        <span>
          <ShieldCheck size={22} />
          Учебная симуляция
        </span>
        <button
          className="close-button"
          aria-label="Закрыть сценарий"
          onClick={() => {
            if (ending || stopped || !started) onClose();
            else setStopped(true);
          }}
        >
          <X size={26} />
        </button>
      </div>
      {!started ? (
        <div className="scenario-intro">
          <span className={`intro-icon ${s.channel}`}>
            <ChannelIcon channel={s.channel} size={40} />
          </span>
          <div className="eyebrow">
            {s.channel === "call"
              ? "ВХОДЯЩИЙ УЧЕБНЫЙ ЗВОНОК"
              : `СООБЩЕНИЕ · ${channelNames[s.channel]}`}
          </div>
          <h2>{s.title}</h2>
          <p>{s.description}</p>
          <div className="scenario-audience">
            <Users size={22} />
            <div>
              <b>Кому особенно пригодится</b>
              <span>{scenarioAudience(s).label}</span>
              <small>
                {scenarioAudience(s).reason} Это рекомендация по контексту, а не
                статистика уязвимости.
              </small>
            </div>
          </div>
          {s.source && (
            <p className="source-note">
              По мотивам каталога для Беларуси · учебная адаптация
            </p>
          )}
          <div className="intro-facts">
            <span>
              <Clock3 size={21} />
              {s.duration}
            </span>
            <span>
              <MessageCircle size={21} />
              Не менее 3 вариантов ответа
            </span>
          </div>
          <div className="intro-notice">
            <LockKeyhole size={25} />
            <p>
              Всё происходит внутри приложения. Деньги не переводятся, сообщения
              никому не отправляются. Можно сделать паузу в любой момент.
            </p>
          </div>
          <p className="quiet">
            Обращение может быть настоящим или мошенническим. Вы узнаете это в
            разборе. Учебные истории — вымышленные, основаны на типичных
            ситуациях.
          </p>
          <button className="primary" onClick={() => setStarted(true)}>
            Начать ситуацию <ArrowRight size={22} />
          </button>
        </div>
      ) : stopped ? (
        <div className="stopped">
          <Heart size={50} />
          <h2 tabIndex={-1} ref={heading}>
            Можно сделать паузу
          </h2>
          <p>
            На сегодня достаточно. Такие ситуации могут вызывать напряжение —
            это нормально. Незавершённая попытка не оценивается и не
            сохраняется.
          </p>
          <button className="primary" onClick={onClose}>
            {returnLabel ??
              (onNext ? "К маршруту подборки" : "Вернуться к практике")}
          </button>
          <button className="text-button" onClick={() => setStopped(false)}>
            Продолжить эту ситуацию
          </button>
        </div>
      ) : ending ? (
        <div className="debrief">
          <OutcomeStatus scenario={s} endingId={node} steps={steps} />
          <div className="eyebrow">РАЗБОР СИТУАЦИИ</div>
          <h2 tabIndex={-1} ref={heading}>
            {ending.title}
          </h2>
          <div className={`consequence-summary ${ending.outcome}`}>
            <b>Чем закончились ваши действия</b>
            <p className="ending-description">{ending.message}</p>
          </div>
          <div className="reality">
            <CircleHelp size={22} />
            {s.reality === "legitimate"
              ? "В этой истории обращение было настоящим."
              : "В этой истории действовал мошенник."}
          </div>
          <DebriefAssessment scenario={s} endingId={node} steps={steps} />
          <h3>Весь ход ваших решений</h3>
          <ol className="decision-list">
            {steps.map((step, i) => (
              <li key={i}>
                <span className={`decision-marker ${step.choice.assessment}`}>
                  {i + 1}
                </span>
                <div>
                  <span className="assessment-label">
                    {step.choice.assessment === "safe"
                      ? "Безопасное действие"
                      : step.choice.assessment === "risk"
                        ? "Ошибка · опасное действие"
                        : "Проверки пока недостаточно"}
                  </span>
                  <b>{step.choice.text}</b>
                  <p>{step.choice.explanation}</p>
                  {s.nodes[step.node].evidence && (
                    <EvidenceCard
                      evidence={s.nodes[step.node].evidence!}
                      review
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="lesson-box">
            <h3>
              <BookOpen size={25} />
              Что взять с собой
            </h3>
            <ul>
              {s.lessons.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          {s.commonMistakes && (
            <section className="common-mistakes">
              <h3>На чём легко ошибиться</h3>
              <p>
                Такие решения могут казаться естественными. Полезно замечать их
                до следующей ситуации.
              </p>
              <ul>
                {s.commonMistakes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {ending.outcome === "risk" && (
            <p className="quiet">
              Если похожее произошло в жизни: свяжитесь с банком через
              официальный канал, защитите затронутые аккаунты и сохраните
              доказательства. Подробные шаги — в разделе «Памятка».
            </p>
          )}
          <div className="debrief-actions">
            {onNext && (
              <button className="primary" onClick={onNext}>
                {nextLabel || "Следующая история"}
                <ArrowRight size={21} />
              </button>
            )}
            <button className="primary" onClick={restart}>
              Попробовать другой путь <ArrowRight size={22} />
            </button>
            <button className="secondary" onClick={onClose}>
              {returnLabel ?? (onNext ? "К маршруту подборки" : "К ситуациям")}
            </button>
          </div>
        </div>
      ) : (
        <div className="simulation-layout">
          <aside className="simulation-context">
            <button className="text-button" onClick={() => setStopped(true)}>
              <ArrowLeft size={20} />К практике
            </button>
            <span className="eyebrow">СИТУАЦИЯ</span>
            <h2>{s.title}</h2>
            <p>{s.nodes[s.start].context || s.description}</p>
            <div className="context-tip">
              <Shield size={28} />
              <p>
                Не спешите. Выберите действие, которое предприняли бы в жизни.
              </p>
            </div>
            <div className="stop-controls">
              <button className="secondary" onClick={() => setStopped(true)}>
                Остановить ситуацию
              </button>
              <button className="text-button" onClick={() => setStopped(true)}>
                <Heart size={20} />
                Мне некомфортно
              </button>
            </div>
          </aside>
          <div className={`chat-device ${identity!.channel}`}>
            {scenarioChannels(s).length > 1 && (
              <div className="channel-transition" role="status">
                Сейчас: {channelNames[identity!.channel]} · {identity!.sender}
              </div>
            )}
            <div className="device-status">
              <span>19:41</span>
              <span>▥ ▰</span>
            </div>
            <div className="chat-header">
              <ArrowLeft size={25} />
              <span className="contact-avatar">
                {current.speaker === "narrator" ? (
                  <BookOpen size={22} />
                ) : (
                  identity!.sender[0]
                )}
              </span>
              <div>
                <b>
                  {current.speaker === "narrator"
                    ? "После вашего решения"
                    : identity!.sender}
                </b>
                <small>
                  {current.speaker === "narrator"
                    ? "Учебное событие · вне переписки"
                    : identity!.channel === "web"
                      ? "Учебная страница · без внешних переходов"
                      : identity!.channel === "email"
                        ? "Электронное письмо · учебная копия"
                        : identity!.channel === "sms"
                          ? "Текстовое сообщение"
                          : `${channelNames[identity!.channel]} · в сети`}
                </small>
              </div>
              {current.speaker === "narrator" ? null : identity!.channel ===
                "viber" ? (
                <Phone size={25} />
              ) : (
                <Ellipsis size={28} />
              )}
            </div>
            {identity!.channel === "call" ? (
              <CallScene
                key={node}
                scenario={s}
                scene={current}
                steps={steps}
              />
            ) : (
              <div
                className="chat-transcript"
                ref={transcript}
                role="log"
                aria-label="Учебная переписка"
                aria-live="polite"
              >
                <span className="chat-date">Сегодня</span>
                {steps.map((step, i) => (
                  <div className="chat-pair" key={i}>
                    <div
                      className={`bubble incoming ${s.nodes[step.node].speaker === "narrator" ? "narrator-event" : ""}`}
                    >
                      <strong className="message-source">
                        {channelNames[sceneIdentity(s, step.node).channel]} ·{" "}
                        {sceneIdentity(s, step.node).sender}
                      </strong>
                      {s.nodes[step.node].message}
                      <small>19:{String(41 + i).padStart(2, "0")}</small>
                    </div>
                    <div className="bubble outgoing">
                      {step.choice.text}
                      <small>
                        <CheckCheck size={16} />
                      </small>
                    </div>
                  </div>
                ))}
                <div
                  className={`bubble incoming ${current.speaker === "narrator" ? "narrator-event" : ""}`}
                >
                  {current.speaker === "narrator" && (
                    <strong className="event-label">
                      Результат вашего действия
                    </strong>
                  )}
                  {current.message}
                  <small>
                    {current.speaker === "narrator"
                      ? "Учебное событие"
                      : "сейчас"}
                  </small>
                </div>
                {current.evidence && (
                  <EvidenceCard key={node} evidence={current.evidence} />
                )}
              </div>
            )}
            <div className="choices">
              <div className="choice-label">
                Как вы поступите? <span>Шаг {steps.length + 1}</span>
              </div>
              {current.choices.map((c, i) => (
                <button key={`${node}-${c.id}`} onClick={() => choose(c.id)}>
                  <span>{i + 1}</span>
                  {c.text}
                  <ChevronRight size={20} />
                </button>
              ))}
              <span className="choice-footnote">
                <LockKeyhole size={14} />
                Выбирайте ответ — вводить личные данные не нужно
              </span>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
