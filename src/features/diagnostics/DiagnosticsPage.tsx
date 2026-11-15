import { intlLocale } from "../../i18n/core";
import { useState, useRef, useEffect } from "react";
import { diagnosticQuestions } from "../../content/diagnostic-questions";
import { skills, type SkillId } from "../../content/skills";
import { diagnosticsStore } from "../../platform/diagnostics";
import {
  newDiagnostic,
  initialForm,
  finalForm,
  formQuestions,
  answerDiagnostic,
  startPost,
  diagnosticSummary,
  diagnosticExport,
  scoreForm,
  answerFollowUp,
  type DiagnosticRun,
} from "./engine";
import { FeatureFrame, StorageNotice, exportFile } from "../shared";
import type { FeatureProps } from "../types";
const number = (n: number) => Number(n.toFixed(1)).toLocaleString(intlLocale());
export default function DiagnosticsPage({ onNavigate }: FeatureProps) {
  const [run, setRun] = useState(() => diagnosticsStore.read().run);
  const [notice, setNotice] = useState(() => diagnosticsStore.isVolatile());
  const [paused, setPaused] = useState(true);
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState(false);
  function store(next: DiagnosticRun | null) {
    setRun(next);
    if (!diagnosticsStore.write({ revision: 1, run: next })) setNotice(true);
  }
  function start() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    store(newDiagnostic(bytes[0], crypto.randomUUID()));
    setPaused(false);
    setSelected("");
  }
  const summary = run ? diagnosticSummary(run) : null;
  const follow = run?.followUp && !run.followUp.complete ? run.followUp : null;
  const active =
    run && !paused && (run.stage === "pre" || run.stage === "post" || follow);
  const form = run
    ? follow
      ? follow.form
      : run.stage === "post"
        ? finalForm(run)
        : initialForm(run)
    : "A";
  const questions = formQuestions(form);
  const cursor = follow ? follow.cursor : (run?.cursor ?? 0);
  const current = questions[cursor];
  const answers = follow
    ? follow.answers
    : run
      ? run.stage === "post"
        ? run.post
        : run.pre
      : {};
  const legend = useRef<HTMLLegendElement>(null);
  useEffect(() => {
    if (active) legend.current?.focus();
  }, [Boolean(active), cursor, form]);
  function move(index: number) {
    if (!run) return;
    store(
      follow
        ? { ...run, followUp: { ...follow, cursor: index } }
        : { ...run, cursor: index },
    );
    setSelected("");
  }
  function submit() {
    if (!run) return;
    const choice = selected || answers[current.id];
    if (!choice) return;
    const next = follow
      ? answerFollowUp(run, current.id, choice)
      : answerDiagnostic(run, current.id, choice);
    store(next);
    setSelected("");
  }
  return (
    <FeatureFrame
      title="Диагностика до и после"
      description="Два разных набора по 12 коротких ситуаций. Это добровольная учебная проверка без таймера и оценки личности."
      onNavigate={onNavigate}
    >
      <StorageNotice failed={notice} />
      {!run ? (
        <section className="feature-panel">
          <h2>Посмотрите, как меняются ваши решения</h2>
          <p>
            Сначала входной тест, затем практика и другой итоговый тест
            сопоставимой сложности. Порядок A→B или B→A выбирается случайно
            локально. Во время теста правильные ответы не показываются.
          </p>
          <p>
            Можно сделать паузу, пропустить вопрос и вернуться к нему. Процент
            появится только после всех 12 ответов соответствующей формы.
          </p>
          <button className="primary" onClick={start}>
            Начать диагностику
          </button>
        </section>
      ) : (
        <>
          {active ? (
            <section className="feature-panel">
              <p className="question-progress">
                {follow
                  ? "Повторная проверка"
                  : run.stage === "pre"
                    ? "Входная диагностика"
                    : "Итоговая диагностика"}{" "}
                · вопрос {cursor + 1} из 12 · отвечено{" "}
                {Object.keys(answers).length}
              </p>
              <fieldset className="diagnostic-question" key={current.id}>
                <legend ref={legend} tabIndex={-1}>
                  {current.prompt}
                </legend>
                <div className="diagnostic-options">
                  {current.options.map((o) => (
                    <label key={o.id}>
                      <input
                        type="radio"
                        name="diagnostic-answer"
                        value={o.id}
                        checked={(selected || answers[current.id]) === o.id}
                        onChange={() => setSelected(o.id)}
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="feature-actions">
                <button
                  className="primary"
                  disabled={!(selected || answers[current.id])}
                  onClick={submit}
                >
                  Подтвердить ответ
                </button>
                <button
                  className="secondary"
                  onClick={() => move((cursor + 1) % 12)}
                >
                  Пропустить пока
                </button>
                {cursor > 0 && (
                  <button
                    className="text-button"
                    onClick={() => move(cursor - 1)}
                  >
                    Предыдущий вопрос
                  </button>
                )}
                <button className="text-button" onClick={() => setPaused(true)}>
                  Пауза без оценки
                </button>
              </div>
              <p>
                Для завершения формы ответьте на пропущенные вопросы. Оценка
                отдельных вариантов будет доступна после обеих форм.
              </p>
            </section>
          ) : (
            <>
              {run.stage === "pre" || run.stage === "post" ? (
                <section className="feature-panel">
                  <h2>Диагностика на паузе</h2>
                  <p>
                    Входных ответов: {Object.keys(run.pre).length} / 12.
                    Итоговых: {Object.keys(run.post).length} / 12. Неполной
                    форме процент не присваивается.
                  </p>
                  <button className="primary" onClick={() => setPaused(false)}>
                    Продолжить диагностику
                  </button>
                </section>
              ) : null}
              {run.stage === "practice" && summary?.pre ? (
                <section className="feature-panel">
                  <h2>Это стартовая точка</h2>
                  <p>
                    Входной результат: <b>{number(summary.pre.score)} / 100</b>.
                    Он описывает решения в этих заданиях, а не вас.
                  </p>
                  <SkillProfile values={summary.pre.skills} />
                  <div className="feature-actions">
                    <button
                      className="primary"
                      onClick={() => onNavigate("learning-plan")}
                    >
                      Подобрать практику
                    </button>
                    <button
                      className="secondary"
                      onClick={() => onNavigate("collections")}
                    >
                      Перейти к подборкам
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        store(startPost(run));
                        setPaused(false);
                        setSelected("");
                      }}
                    >
                      Пройти итоговую диагностику
                    </button>
                  </div>
                  <p>
                    Итоговый тест можно начать по собственному решению после
                    практики. Его форма будет другой.
                  </p>
                </section>
              ) : null}
              {run.stage === "complete" && summary?.pre && summary.post ? (
                <>
                  <section className="feature-panel">
                    <h2>Ваши результаты до и после</h2>
                    <div className="score-summary">
                      <div>
                        До<strong>{number(summary.pre.score)} / 100</strong>
                      </div>
                      <div>
                        После<strong>{number(summary.post.score)} / 100</strong>
                      </div>
                      <div>
                        Изменение
                        <strong>
                          {summary.changePp! > 0 ? "+" : ""}
                          {number(summary.changePp!)} п. п.
                        </strong>
                      </div>
                    </div>
                    <div className="skill-breakdown">
                      {skills.map((s) => (
                        <div key={s.id}>
                          <span>{s.title}</span>
                          <b>
                            {number(summary.pre!.skills[s.id].score)} →{" "}
                            {number(summary.post!.skills[s.id].score)}
                          </b>
                        </div>
                      ))}
                    </div>
                    <p>
                      Используется единое правило 2 / 1 / 0 баллов за
                      безопасный, неполный или опасный вариант. Одна проверка не
                      доказывает эффект обучения: на результат влияют повторное
                      тестирование, мотивация и различия заданий. Нулевое и
                      отрицательное изменение тоже возможны.
                    </p>
                    <button
                      className="primary"
                      onClick={() => onNavigate("learning-plan")}
                    >
                      Мой план после диагностики
                    </button>
                  </section>
                  <details className="feature-panel">
                    <summary>Разбор учебных ответов</summary>
                    {diagnosticQuestions.map((q) => (
                      <article key={q.id}>
                        <h3>{q.prompt}</h3>
                        {q.options.map((o) => (
                          <p key={o.id}>
                            <b>
                              {o.text} — {o.points} балл(а).
                            </b>{" "}
                            {o.explanation}
                          </p>
                        ))}
                      </article>
                    ))}
                  </details>
                  <section className="feature-panel">
                    <h2>Повторная проверка спустя время</h2>
                    <p>
                      Это отдельная попытка, она не меняет исходную пару
                      «до/после». В ней используется одна из уже доступных форм;
                      знакомство с заданиями ограничивает интерпретацию.
                    </p>
                    {run.followUp?.complete ? (
                      <>
                        <p>
                          Повторная проверка:{" "}
                          {number(
                            scoreForm(run.followUp.form, run.followUp.answers)!
                              .score,
                          )}{" "}
                          / 100. Основной результат сохранён.
                        </p>
                      </>
                    ) : run.followUp ? (
                      <button
                        className="secondary"
                        onClick={() => setPaused(false)}
                      >
                        Продолжить повторную проверку
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => {
                          store({
                            ...run,
                            followUp: {
                              form: initialForm(run),
                              answers: {},
                              cursor: 0,
                              complete: false,
                            },
                          });
                          setPaused(false);
                        }}
                      >
                        Начать отдельную повторную проверку
                      </button>
                    )}
                  </section>
                </>
              ) : null}
            </>
          )}
          <div className="feature-actions no-print">
            <button
              className="secondary"
              onClick={() =>
                exportFile(
                  "cybershield-diagnostic.json",
                  "application/json",
                  JSON.stringify(diagnosticExport(run), null, 2),
                )
              }
            >
              Экспортировать обезличенную сводку
            </button>
            <button className="text-button" onClick={() => setConfirm(true)}>
              Удалить диагностику
            </button>
          </div>
          {confirm && (
            <aside className="feature-notice">
              <p>
                Удалить ответы основной и повторной диагностики на этом
                устройстве? Прогресс сценариев и подборок останется.
              </p>
              <div className="feature-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    if (!diagnosticsStore.clear()) setNotice(true);
                    setRun(null);
                    setConfirm(false);
                    setPaused(true);
                  }}
                >
                  Подтвердить удаление
                </button>
                <button
                  className="text-button"
                  onClick={() => setConfirm(false)}
                >
                  Отмена
                </button>
              </div>
            </aside>
          )}
        </>
      )}
    </FeatureFrame>
  );
}
function SkillProfile({
  values,
}: {
  values: Record<SkillId, { score: number }>;
}) {
  return (
    <div className="skill-breakdown">
      {skills.map((s) => (
        <div key={s.id}>
          <span>{s.title}</span>
          <b>{number(values[s.id].score)} / 100</b>
        </div>
      ))}
    </div>
  );
}
