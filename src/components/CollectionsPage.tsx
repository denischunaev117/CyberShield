import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Layers3,
  Pause,
  ShieldCheck,
  Users,
} from "lucide-react";
import { collections, type LearningCollection } from "../content/collections";
import { scenarios } from "../content/scenarios";
import type { Scenario } from "../engine";
import {
  freshRun,
  recordResult,
  answerQuiz,
  quizScore,
  collectionReport,
  type CollectionRun,
  type CompletionDetails,
  type Outcome,
} from "../collection-engine";
import {
  readCollectionRuns,
  saveCollectionRuns,
} from "../platform/collections";
export type CollectionScenarioProps = {
  scenario: Scenario;
  onClose: () => void;
  onComplete: (
    s: Scenario,
    outcome: Outcome,
    details: CompletionDetails,
  ) => void;
  onNext: () => void;
  nextLabel: string;
};
export default function CollectionsPage({
  renderScenario,
}: {
  renderScenario: (props: CollectionScenarioProps) => ReactNode;
}) {
  const [runs, setRuns] = useState(() =>
    readCollectionRuns(collections, scenarios),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<Scenario | null>(null);
  const [notice, setNotice] = useState(false);
  const collection = collections.find((c) => c.id === selected);
  const run = collection ? runs[collection.id] : undefined;
  function store(id: string, next: CollectionRun) {
    setRuns((previous) => {
      const updated = { ...previous, [id]: next };
      if (!saveCollectionRuns(updated)) setNotice(true);
      return updated;
    });
  }
  function begin(c: LearningCollection) {
    const next = freshRun(c);
    store(c.id, next);
    setActive(scenarios.find((s) => s.id === c.scenarioIds[0])!);
  }
  function openNext(c: LearningCollection, r: CollectionRun) {
    const next = c.scenarioIds[r.results.length];
    setActive(next ? scenarios.find((s) => s.id === next)! : null);
  }
  function finish(s: Scenario, outcome: Outcome, details: CompletionDetails) {
    if (!collection) return;
    setRuns((previous) => {
      const current = previous[collection.id];
      if (!current) return previous;
      const next = recordResult(collection, current, {
        scenarioId: s.id,
        outcome,
        ...details,
      });
      const updated = { ...previous, [collection.id]: next };
      if (!saveCollectionRuns(updated)) setNotice(true);
      return updated;
    });
  }
  return (
    <section className="collections-page">
      {!collection ? (
        <>
          <div className="eyebrow">НЕСКОЛЬКО СИТУАЦИЙ — ОДИН НАВЫК</div>
          <h1>Подборки для уверенных решений</h1>
          <p className="page-intro">
            Пройдите связанные истории в своём темпе, а затем соберите опыт в
            общий вывод. Квиз в конце — только по желанию.
          </p>
          <div className="collection-how">
            <span>
              <Layers3 size={19} />
              10 историй в подборке
            </span>
            <span>
              <Pause size={19} />
              Можно продолжить позже
            </span>
            <span>
              <BookOpen size={19} />
              Общий урок и необязательный квиз
            </span>
          </div>
          <div className="learning-grid">
            {collections.map((c, i) => {
              const r = runs[c.id];
              const done = r?.results.length ?? 0;
              return (
                <article className={`learning-card learning-${i}`} key={c.id}>
                  <div className="learning-cover">
                    <Layers3 size={34} strokeWidth={1.2} />
                    <span>ПОДБОРКА 0{i + 1}</span>
                  </div>
                  <div className="learning-body">
                    <h2>{c.title}</h2>
                    <p>{c.description}</p>
                    <div className="skill-chips">
                      {c.skills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                    <div className="learning-meta">
                      <Clock3 size={15} />
                      {c.duration}
                    </div>
                    <div className="collection-progress">
                      <span>
                        {done === c.scenarioIds.length
                          ? "Истории завершены"
                          : `Пройдено ${done} из ${c.scenarioIds.length}`}
                      </span>
                      <progress
                        value={done}
                        max={c.scenarioIds.length}
                        aria-label={`Прогресс: ${c.title}`}
                      />
                    </div>
                    <button
                      className="primary"
                      onClick={() => setSelected(c.id)}
                    >
                      {done === c.scenarioIds.length
                        ? "Открыть итог"
                        : done
                          ? "Продолжить подборку"
                          : "Открыть подборку"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="quiet">
            Любую историю можно пройти отдельно в разделе «Практика». Это не
            меняет порядок прохождения подборки.
          </p>
        </>
      ) : (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} />
            Все подборки
          </button>
          <div className="eyebrow">ПРАКТИКА С ОБЩИМ СМЫСЛОМ</div>
          <h1>{collection.title}</h1>
          <p className="page-intro">{collection.description}</p>
          <p className="audience-note">
            <Users size={16} />
            {collection.audience}
          </p>
          {!run || run.results.length < collection.scenarioIds.length ? (
            <>
              <div className="collection-detail-banner">
                <div>
                  <span className="eyebrow">ВАШ МАРШРУТ</span>
                  <h2>
                    {run
                      ? `Следующая история: ${run.results.length + 1} из ${collection.scenarioIds.length}`
                      : `${collection.scenarioIds.length} разных ситуаций`}
                  </h2>
                  <p>
                    Пауза не считается завершением. Можно вернуться позже.
                    Повтор до перехода к следующей истории заменит последний
                    результат.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    run ? openNext(collection, run) : begin(collection)
                  }
                >
                  {run ? "Продолжить" : "Начать подборку"}
                  <ArrowRight size={18} />
                </button>
              </div>
              <div className="route-list">
                {collection.scenarioIds.map((id, i) => {
                  const s = scenarios.find((s) => s.id === id)!;
                  const result = run?.results[i];
                  return (
                    <div
                      className={`route-row ${result ? "done" : ""}`}
                      key={id}
                    >
                      <span className="route-number">
                        {result ? (
                          <Check size={17} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <b>{s.title}</b>
                        <small>
                          {s.topic} · {s.duration}
                        </small>
                      </div>
                      <span>
                        {result
                          ? "Разобрано"
                          : i === (run?.results.length ?? 0)
                            ? "Следующая"
                            : "Впереди"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <CollectionSummary
              collection={collection}
              run={run}
              onChange={(next) => store(collection.id, next)}
              onRestart={() => begin(collection)}
            />
          )}
        </>
      )}
      {notice && (
        <p className="storage-notice" role="status">
          Браузер не разрешил сохранить подборку. Текущий результат доступен до
          закрытия страницы.
        </p>
      )}
      {collection &&
        run &&
        active &&
        renderScenario({
          scenario: active,
          onClose: () => setActive(null),
          onComplete: finish,
          onNext: () => openNext(collection, run),
          nextLabel:
            run.results.length === collection.scenarioIds.length
              ? "К итогу подборки"
              : "Следующая история",
        })}
    </section>
  );
}
function CollectionSummary({
  collection: c,
  run,
  onChange,
  onRestart,
}: {
  collection: LearningCollection;
  run: CollectionRun;
  onChange: (r: CollectionRun) => void;
  onRestart: () => void;
}) {
  const report = collectionReport(run);
  const score = quizScore(c, run);
  const nextQuestion = c.quiz.find((q) => !run.quiz.answers[q.id]);
  return (
    <div className="collection-summary">
      <div className="summary-heading">
        <span>
          <ShieldCheck size={32} />
        </span>
        <div>
          <div className="eyebrow">ВЫ ПРОШЛИ ВСЮ ПОДБОРКУ</div>
          <h2>Что объединяет эти ситуации</h2>
        </div>
      </div>
      <div className="report-counters">
        <div>
          <strong>{report.completed}</strong>
          <span>историй разобрано</span>
        </div>
        <div>
          <strong>{report.riskyDecisions}</strong>
          <span>решений с риском — для внимания</span>
        </div>
        <div>
          <strong>{report.cautiousOutcomes + report.riskyOutcomes}</strong>
          <span>историй с последствиями или неполной проверкой</span>
        </div>
      </div>
      <p className="quiet">
        Это описание вашего пути, а не оценка человека или измерение роста
        грамотности. Даже после безопасной остановки последствия предыдущих
        действий могут сохраняться.
      </p>
      <div className="collection-lessons">
        <h3>Общий урок подборки</h3>
        <ol>
          {c.lessons.map((lesson) => (
            <li key={lesson}>{lesson}</li>
          ))}
        </ol>
      </div>
      <details className="collection-results">
        <summary>Мой путь: решения и рекомендации</summary>
        {run.results.map((r) => {
          const s = scenarios.find((s) => s.id === r.scenarioId)!;
          return (
            <article key={r.scenarioId}>
              <span className={`result-status ${r.outcome}`}>
                {r.outcome === "safe"
                  ? "Безопасный исход"
                  : r.outcome === "caution"
                    ? "Остались последствия или вопросы"
                    : "Есть рискованные последствия"}
              </span>
              <h3>{s.title}</h3>
              <b>{s.endings[r.endingId].title}</b>
              <p>{s.endings[r.endingId].message}</p>
              <p className="result-counts">
                Решения: безопасные — {r.counts.safe}, требующие проверки —{" "}
                {r.counts.caution}, рискованные — {r.counts.risk}.
              </p>
              {r.outcome !== "safe" || r.counts.risk > 0 ? (
                <ul>
                  {s.lessons.slice(0, 2).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </details>
      {run.quiz.status === "not-started" || run.quiz.status === "declined" ? (
        <section className="quiz-invite">
          <span className="eyebrow">ПО ЖЕЛАНИЮ · 3 ВОПРОСА</span>
          <h3>
            {run.quiz.status === "declined"
              ? "Итог готов. Квиз можно оставить на потом."
              : "Хотите проверить, что запомнилось?"}
          </h3>
          <p>
            Небольшой квиз по навыкам этой подборки. Он не влияет на завершение
            и не закрывает доступ к другим историям.
          </p>
          <div>
            <button
              className="primary"
              onClick={() =>
                onChange({
                  ...run,
                  quiz: { status: "in-progress", answers: {} },
                })
              }
            >
              {run.quiz.status === "declined"
                ? "Всё-таки пройти квиз"
                : "Да, пройти квиз"}
              <ArrowRight size={17} />
            </button>
            {run.quiz.status === "not-started" && (
              <button
                className="secondary"
                onClick={() =>
                  onChange({
                    ...run,
                    quiz: { status: "declined", answers: {} },
                  })
                }
              >
                Нет, перейти к итогу
              </button>
            )}
          </div>
          {run.quiz.status === "declined" && (
            <p role="status" className="quiz-skipped">
              Подборка завершена. Вы выбрали итог без квиза.
            </p>
          )}
        </section>
      ) : run.quiz.status === "in-progress" && nextQuestion ? (
        <QuizQuestionCard
          key={nextQuestion.id}
          collection={c}
          run={run}
          onChange={onChange}
        />
      ) : score ? (
        <section className="quiz-review">
          <div className="eyebrow">КВИЗ ЗАВЕРШЁН</div>
          <h3>
            Ответы: {score.correct} из {score.total}
          </h3>
          <p>
            Ошибки помогают заметить, к какому правилу вернуться. Ниже —
            объяснение каждого вопроса.
          </p>
          {c.quiz.map((q) => {
            const chosen = q.options.find(
              (o) => o.id === run.quiz.answers[q.id],
            )!;
            return (
              <article key={q.id}>
                <b>{q.text}</b>
                <p>Ваш ответ: {chosen.text}</p>
                {chosen.id !== q.correctId && (
                  <p>
                    Подходящий ответ:{" "}
                    {q.options.find((o) => o.id === q.correctId)!.text}
                  </p>
                )}
                <p className="quiz-explanation">{q.explanation}</p>
              </article>
            );
          })}
          <button
            className="secondary"
            onClick={() =>
              onChange({ ...run, quiz: { status: "in-progress", answers: {} } })
            }
          >
            Повторить только квиз
          </button>
        </section>
      ) : null}
      <div className="collection-finish">
        <BookOpen size={20} />
        <p>
          Можно вернуться к итогу в любое время через раздел «Подборки» в этом
          браузере. Начать заново — значит заменить результат этой подборки;
          одиночная практика сохранится.
        </p>
        <button className="text-button" onClick={onRestart}>
          Пройти подборку заново
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
function QuizQuestionCard({
  collection: c,
  run,
  onChange,
}: {
  collection: LearningCollection;
  run: CollectionRun;
  onChange: (r: CollectionRun) => void;
}) {
  const [selected, setSelected] = useState("");
  const q = c.quiz.find((q) => !run.quiz.answers[q.id])!;
  const current = Object.keys(run.quiz.answers).length + 1;
  return (
    <section className="quiz-question">
      <span className="eyebrow">
        НЕОБЯЗАТЕЛЬНЫЙ КВИЗ · {current} ИЗ {c.quiz.length}
      </span>
      <fieldset>
        <legend>{q.text}</legend>
        {q.options.map((o) => (
          <label key={o.id} className={selected === o.id ? "chosen" : ""}>
            <input
              type="radio"
              name={q.id}
              value={o.id}
              checked={selected === o.id}
              onChange={() => setSelected(o.id)}
            />
            {o.text}
          </label>
        ))}
      </fieldset>
      <div className="quiz-actions">
        <button
          className="primary"
          disabled={!selected}
          onClick={() => onChange(answerQuiz(c, run, q.id, selected))}
        >
          {current === c.quiz.length ? "Закончить квиз" : "Следующий вопрос"}
          <ArrowRight size={16} />
        </button>
        <button
          className="text-button"
          onClick={() =>
            onChange({ ...run, quiz: { ...run.quiz, status: "declined" } })
          }
        >
          Завершить без квиза
        </button>
      </div>
    </section>
  );
}
