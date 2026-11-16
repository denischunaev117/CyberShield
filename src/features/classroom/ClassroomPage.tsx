import { intlLocale } from "../../i18n/core";
import { useState } from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { classroomLessons } from "../../content/classroom-lessons";
import { scenarios } from "../../content/scenarios";
import { skillName } from "../../content/skills";
import { classroomStore } from "../../platform/classroom";
import {
  newLessonRun,
  recordLessonResult,
  answerLesson,
  lessonReport,
  lessonPublicUrl,
  parseLessonReport,
  aggregateReports,
  groupCsv,
  type LessonReport,
  type LessonRun,
} from "./engine";
import LessonQr from "./LessonQr";
import { FeatureFrame, StorageNotice, exportFile } from "../shared";
import type { FeatureProps } from "../types";
import {
  isNativeApp,
  nativePrint,
  nativePrintFailure,
} from "../../platform/native";
const n = (x: number | null) =>
  x === null ? "нет данных" : Number(x.toFixed(1)).toLocaleString(intlLocale());
function printSheet(kind: string) {
  document.body.dataset.printSheet = kind;
  window.addEventListener(
    "afterprint",
    () => {
      delete document.body.dataset.printSheet;
    },
    { once: true },
  );
  if (isNativeApp()) void nativePrint().catch(nativePrintFailure);
  else window.print();
}
export default function ClassroomPage({
  onNavigate,
  onOpenScenario,
}: FeatureProps) {
  const [lessonId, setLessonId] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("lesson"),
  );
  const [runs, setRuns] = useState(() => classroomStore.read().runs);
  const [notice, setNotice] = useState(() => classroomStore.isVolatile());
  const [selected, setSelected] = useState("");
  const [quiz, setQuiz] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reports, setReports] = useState<LessonReport[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [groupLesson, setGroupLesson] = useState(classroomLessons[0].id);
  const [busy, setBusy] = useState(false);
  const lesson = classroomLessons.find((l) => l.id === lessonId);
  const run = lesson ? (runs[lesson.id] ?? newLessonRun(lesson.id)) : null;
  const current = lesson?.quiz.find((q) => !run?.answers[q.id]);
  const report = lesson && run ? lessonReport(lesson, run) : null;
  function choose(id: string | null) {
    setLessonId(id);
    setQuiz(false);
    setSelected("");
    setConfirm(false);
    const u = new URL(location.href);
    if (id) u.searchParams.set("lesson", id);
    else u.searchParams.delete("lesson");
    history.replaceState(null, "", u);
  }
  function store(next: LessonRun) {
    setRuns((previous) => {
      const all = { ...previous, [next.lessonId]: next };
      if (!classroomStore.write({ revision: 1, runs: all })) setNotice(true);
      return all;
    });
  }
  async function importReports(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    const valid: LessonReport[] = [];
    const problems: string[] = [];
    if (files.length > 100) {
      setErrors(["За один раз можно импортировать не более 100 файлов."]);
      setBusy(false);
      return;
    }
    for (const [i, file] of [...files].entries()) {
      try {
        if (file.size > 65536) throw Error("Файл больше 64 КБ");
        valid.push(parseLessonReport(await file.text()));
      } catch (e) {
        problems.push(`Файл ${i + 1}: ${(e as Error).message}`);
      }
    }
    setReports((previous) => [...previous, ...valid].slice(-200));
    setErrors(problems);
    if (valid[0]) setGroupLesson(valid[0].lessonId);
    setBusy(false);
  }
  const groupReports = reports.filter((r) => r.lessonId === groupLesson);
  const group = aggregateReports(groupReports);
  return (
    <FeatureFrame
      title="Для занятий"
      description="Готовые занятия для школ, колледжей и взрослых групп. Без регистрации, списка учеников, обязательной передачи файлов и серверной аналитики."
      onNavigate={onNavigate}
    >
      <StorageNotice failed={notice} />
      {lessonId !== null && !lesson ? (
        <section className="feature-empty">
          <h2>Занятие по этой ссылке не найдено</h2>
          <p>Выберите один из опубликованных методических маршрутов.</p>
          <button className="secondary" onClick={() => choose(null)}>
            К списку занятий
          </button>
        </section>
      ) : null}
      {!lesson && (
        <div className="feature-card-grid lesson-list">
          {classroomLessons.map((l) => (
            <button
              className="feature-card"
              key={l.id}
              onClick={() => choose(l.id)}
            >
              <span>{l.duration}</span>
              <b>{l.title}</b>
              <span>{l.outcomes[0]}</span>
            </button>
          ))}
        </div>
      )}
      {lesson && run && report && (
        <>
          <div className="feature-actions no-print">
            <button className="secondary" onClick={() => choose(null)}>
              <ArrowLeft size={22} />
              Все занятия
            </button>
            <button className="secondary" onClick={() => printSheet("lesson")}>
              <Printer size={22} />
              Распечатать методический лист
            </button>
          </div>
          <article className="lesson-sheet print-sheet">
            <h2>{lesson.title}</h2>
            <p>
              <b>{lesson.duration}</b> · {lesson.audience}
            </p>
            <section className="feature-panel">
              <h3>Образовательные результаты</h3>
              <ul>
                {lesson.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
            <section className="feature-panel">
              <h3>План ведущего</h3>
              {lesson.schedule.map((s) => (
                <div key={s.title}>
                  <h4>
                    {s.title} · {s.minutes}
                  </h4>
                  <p>{s.activity}</p>
                </div>
              ))}
            </section>
            <aside className="feature-notice">
              <b>Обсуждайте вымышленные ситуации.</b> Не просите детей или
              взрослых показывать настоящие переписки, сообщать фамилии,
              семейные доходы, реквизиты или обстоятельства пережитого обмана.
              Допустимо не отвечать и не передавать результат.
            </aside>
            <section className="feature-panel">
              <h3>Практические истории занятия</h3>
              <ol>
                {lesson.scenarioIds.map((id) => {
                  const s = scenarios.find((s) => s.id === id)!;
                  return (
                    <li key={id}>
                      <b>{s.title}</b> · {s.topic}
                      <p>{s.description}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
            <LessonQr url={lessonPublicUrl(lesson.id)} />
            <section className="feature-panel lesson-discussion">
              <h3>Вопросы для обсуждения</h3>
              {lesson.discussion.map((d) => (
                <div key={d.question}>
                  <h4>{d.question}</h4>
                  <p>{d.answer}</p>
                </div>
              ))}
            </section>
            <section className="teacher-key">
              <h3>Ключ к мини-квизу для ведущего</h3>
              {lesson.quiz.map((q) => (
                <div key={q.id}>
                  <h4>{q.text}</h4>
                  {q.options
                    .filter((o) => o.points === 2)
                    .map((o) => (
                      <p key={o.id}>
                        {o.text} {o.explanation}
                      </p>
                    ))}
                </div>
              ))}
            </section>
          </article>
          <section className="classroom-work no-print">
            <h2>Практика участника</h2>
            <p>
              Разобрано историй: {Object.keys(run.results).length} из{" "}
              {lesson.scenarioIds.length}. Можно проходить их в предложенном
              порядке и делать паузу.
            </p>
            <div className="feature-card-grid">
              {lesson.scenarioIds.map((id) => {
                const s = scenarios.find((s) => s.id === id)!;
                return (
                  <div className="feature-card" key={id}>
                    <span>{run.results[id] ? "Разобрана" : "Предстоит"}</span>
                    <h3>{s.title}</h3>
                    <button
                      className="primary"
                      onClick={() =>
                        onOpenScenario(id, (story, outcome, details) =>
                          setRuns((previous) => {
                            const old =
                              previous[lesson.id] ?? newLessonRun(lesson.id);
                            const next = recordLessonResult(
                              old,
                              story.id,
                              outcome,
                              details,
                            );
                            const all = { ...previous, [lesson.id]: next };
                            if (
                              !classroomStore.write({ revision: 1, runs: all })
                            )
                              setNotice(true);
                            return all;
                          }),
                        )
                      }
                    >
                      {run.results[id]
                        ? "Повторить ситуацию"
                        : "Открыть ситуацию"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="feature-panel">
              <h3>Мини-квиз по желанию</h3>
              <p>
                Три коротких вопроса для обсуждения. Можно не проходить квиз или
                остановиться; это не ограничивает доступ к практике.
              </p>
              {!quiz && current ? (
                <button className="secondary" onClick={() => setQuiz(true)}>
                  Открыть мини-квиз
                </button>
              ) : current && quiz ? (
                <>
                  <fieldset className="diagnostic-question" key={current.id}>
                    <legend>{current.text}</legend>
                    <div className="diagnostic-options">
                      {current.options.map((o) => (
                        <label key={o.id}>
                          <input
                            type="radio"
                            name="lesson-answer"
                            checked={selected === o.id}
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
                      disabled={!selected}
                      onClick={() => {
                        store(answerLesson(run, current.id, selected));
                        setSelected("");
                      }}
                    >
                      Подтвердить ответ мини-квиза
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuiz(false);
                        setSelected("");
                      }}
                    >
                      Остановить мини-квиз
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p role="status">
                    Мини-квиз разобран:{" "}
                    {n((100 * report.points) / report.maxPoints)} / 100.
                  </p>
                  {lesson.quiz.map((q) => {
                    const o = q.options.find(
                      (o) => o.id === run.answers[q.id],
                    )!;
                    return (
                      <div key={q.id}>
                        <h4>{q.text}</h4>
                        <p>
                          {o.text} — {o.points} балл(а). {o.explanation}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <section className="feature-panel">
              <h3>Ваш обезличенный результат занятия</h3>
              <p>
                Статус:{" "}
                {report.status === "complete"
                  ? "маршрут и мини-квиз завершены"
                  : "попытка не завершена"}
                . Историй {report.completedScenarios} /{" "}
                {lesson.scenarioIds.length}; ответов {report.answeredQuestions}{" "}
                / {lesson.quiz.length}. Неполной попытке общий балл не
                присваивается.
              </p>
              <p>
                Файл содержит только ID занятия, счётчики и баллы по навыкам.
                Передавайте его преподавателю только добровольно; имени,
                переписки и постоянного ID устройства в нём нет.
              </p>
              <button
                className="primary"
                onClick={() =>
                  exportFile(
                    "cybershield-lesson.json",
                    "application/json",
                    JSON.stringify(report, null, 2),
                  )
                }
              >
                <Download size={22} />
                Экспортировать обезличенный результат
              </button>
              <button className="text-button" onClick={() => setConfirm(true)}>
                Начать занятие заново
              </button>
              {confirm && (
                <div className="feature-notice">
                  <p>
                    Заменить результат этого занятия новой попыткой? Обычная
                    практика и подборки останутся.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      store(newLessonRun(lesson.id));
                      setQuiz(false);
                      setSelected("");
                      setConfirm(false);
                    }}
                  >
                    Подтвердить новую попытку
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirm(false)}
                  >
                    Отмена
                  </button>
                </div>
              )}
            </section>
          </section>
        </>
      )}
      <section className="teacher-tools feature-panel no-print">
        <h2>Локальная сводка преподавателя</h2>
        <p>
          Импортируйте добровольно переданные файлы результатов занятия. Файлы
          не отправляются на сервер и не сохраняются после закрытия раздела.
          Передавайте по одному файлу от участника: без идентификаторов нельзя
          отличить повторный импорт от одинаковых результатов разных людей.
        </p>
        <label className="report-import">
          Выбрать JSON-результаты
          <input
            type="file"
            accept=".json,application/json"
            multiple
            disabled={busy}
            onChange={(e) => {
              void importReports(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <p role="status">
          {busy ? "Проверяем файлы…" : `Принято сводок: ${reports.length}`}
        </p>
        {errors.length > 0 && (
          <div className="form-error" role="alert">
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <label htmlFor="group-lesson">Занятие для групповой сводки</label>
        <select
          id="group-lesson"
          value={groupLesson}
          onChange={(e) => setGroupLesson(e.target.value)}
        >
          {classroomLessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <p>
          Результаты разных занятий не объединяются в общий балл. Это учебные
          клиентские сводки, а не защищённый экзамен или доказательство числа
          уникальных участников.
        </p>
        <div className="feature-actions">
          <button
            className="secondary"
            disabled={!groupReports.length}
            onClick={() =>
              exportFile(
                "cybershield-group.csv",
                "text/csv;charset=utf-8",
                groupCsv(groupReports),
              )
            }
          >
            Экспортировать CSV группы
          </button>
          <button
            className="secondary"
            disabled={!groupReports.length}
            onClick={() => printSheet("group")}
          >
            Распечатать сводку группы
          </button>
          <button
            className="text-button"
            onClick={() => {
              setReports([]);
              setErrors([]);
            }}
          >
            Очистить импортированные сводки
          </button>
        </div>
      </section>
      <section className="group-sheet feature-panel print-sheet">
        <h2>
          Групповая сводка:{" "}
          {classroomLessons.find((l) => l.id === groupLesson)!.title}
        </h2>
        {!groupReports.length ? (
          <p>Пока нет файлов для этого занятия.</p>
        ) : (
          <>
            <p>
              Сводок N: {group.n}. Завершённых: {group.completed};
              незавершённых: {group.incomplete}.
            </p>
            <p>
              Среднее завершённых попыток: {n(group.mean)}. Медиана:{" "}
              {n(group.median)}.
            </p>
            <ul>
              <li>Менее 50: {group.distribution[0]}</li>
              <li>От 50 до 80: {group.distribution[1]}</li>
              <li>80 и выше: {group.distribution[2]}</li>
            </ul>
            {group.skills ? (
              <>
                <h3>Агрегаты по навыкам</h3>
                <ul>
                  {Object.entries(group.skills).map(([id, score]) => (
                    <li key={id}>
                      {skillName(id as Parameters<typeof skillName>[0])}:{" "}
                      {n(score!)}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                Понавыковая детализация скрыта: нужно не менее пяти завершённых
                сводок одного занятия. Для отдельного навыка также нужны пять
                результатов.
              </p>
            )}
          </>
        )}
      </section>
    </FeatureFrame>
  );
}
