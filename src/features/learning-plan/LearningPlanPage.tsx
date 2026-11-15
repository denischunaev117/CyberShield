import { useState } from "react";
import { skills, skillName, type SkillId } from "../../content/skills";
import { scenarios } from "../../content/scenarios";
import { diagnosticsStore } from "../../platform/diagnostics";
import { diagnosticSummary } from "../diagnostics/engine";
import { learningStatsStore } from "../../platform/learning-stats";
import { learningPlanStore } from "../../platform/learning-plan";
import { progressStore } from "../../platform/progress";
import {
  makePlan,
  scoresFromRecent,
  scoresFromLegacy,
  recordPlanResult,
  type Plan,
  type SkillScores,
} from "./engine";
import { FeatureFrame, StorageNotice, exportFile } from "../shared";
import type { FeatureProps } from "../types";
export default function LearningPlanPage({
  onNavigate,
  onOpenScenario,
}: FeatureProps) {
  const [plan, setPlan] = useState(() => learningPlanStore.read().plan);
  const [manual, setManual] = useState<SkillId[]>([]);
  const [edit, setEdit] = useState(false);
  const [notice, setNotice] = useState(
    () => learningPlanStore.isVolatile() || learningStatsStore.isVolatile(),
  );
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const diagnostic = diagnosticsStore.read().run;
  const summary = diagnostic ? diagnosticSummary(diagnostic) : null;
  const recent = learningStatsStore.read();
  const legacy = progressStore.read(new Set(scenarios.map((s) => s.id)));
  const measured = summary?.post ?? summary?.pre;
  const source: Plan["source"] = measured
    ? summary?.post
      ? "diagnostic-post"
      : "diagnostic-pre"
    : Object.keys(recent.records).length
      ? "recent"
      : "legacy";
  const scores: SkillScores = measured
    ? Object.fromEntries(
        Object.entries(measured.skills).map(([id, s]) => [id, s.score]),
      )
    : source === "recent"
      ? scoresFromRecent(recent)
      : scoresFromLegacy(legacy);
  function store(next: Plan | null) {
    setPlan(next);
    if (!learningPlanStore.write({ revision: 1, plan: next })) setNotice(true);
  }
  function build() {
    try {
      store(
        makePlan(
          manual.length ? {} : scores,
          manual.length ? "manual" : source,
          legacy.slice(-10).map((r) => r.id),
          manual,
        ),
      );
      setEdit(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <FeatureFrame
      title="Мой план обучения"
      description="Пять историй для выбранных навыков. Это рекомендация, а не оценка человека; любую другую практику можно открыть в любой момент."
      onNavigate={onNavigate}
    >
      <StorageNotice failed={notice} />
      <section className="feature-panel">
        <h2>На чём основана рекомендация</h2>
        <p>
          {measured
            ? `Используется ${summary?.post ? "итоговая" : "входная"} диагностика: баллы по навыкам, без личных сообщений.`
            : source === "recent"
              ? "Предварительная рекомендация по счётчикам ваших последних учебных решений. Навыки связаны с историями, поэтому эта оценка менее точная, чем диагностика."
              : legacy.length
                ? "Есть только старые исходы safe/caution/risk. Это слабая предварительная эвристика, а не восстановление ваших ответов."
                : "Данных пока нет. Выберите 1–3 навыка вручную или начните короткую диагностику."}
        </p>
        <button className="secondary" onClick={() => onNavigate("diagnostics")}>
          Пройти диагностику
        </button>
      </section>
      {(!plan || edit) && (
        <section className="feature-panel">
          <h2>Выберите фокус</h2>
          <p>
            Можно оставить автоматическую рекомендацию или выбрать до трёх
            навыков вручную.
          </p>
          <div className="skill-selector">
            {skills.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={manual.includes(s.id)}
                  disabled={manual.length >= 3 && !manual.includes(s.id)}
                  onChange={(e) =>
                    setManual((v) =>
                      e.target.checked
                        ? [...v, s.id]
                        : v.filter((x) => x !== s.id),
                    )
                  }
                />
                <span>
                  <b>{s.title}</b>
                  <br />
                  {s.description}
                </span>
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="feature-actions">
            <button className="primary" onClick={build}>
              Построить план из пяти историй
            </button>
            {plan && (
              <button className="text-button" onClick={() => setEdit(false)}>
                Оставить текущий план
              </button>
            )}
          </div>
        </section>
      )}
      {plan && !edit && (
        <>
          <section className="feature-panel">
            <h2>Почему предложен этот маршрут</h2>
            <p>
              {plan.source.startsWith("diagnostic")
                ? "В диагностике эти навыки получили более низкие баллы. Разберём новые ситуации с теми же задачами."
                : plan.source === "manual"
                  ? "Вы выбрали эти навыки сами. Маршрут составлен из существующей библиотеки."
                  : "По доступным учебным исходам эти темы стоит разобрать дополнительно. Рекомендация предварительная."}
            </p>
            <ul>
              {plan.skillIds.map((id) => (
                <li key={id}>{skillName(id)}</li>
              ))}
            </ul>
            <p>
              Разобрано историй: {Object.keys(plan.results).length} из 5. Повтор
              одной истории заменяет её итог, а остановка без финала не
              засчитывается.
            </p>
          </section>
          <ol className="plan-route">
            {plan.scenarioIds.map((id, index) => {
              const s = scenarios.find((s) => s.id === id)!;
              const result = plan.results[id];
              return (
                <li key={id}>
                  <span className="status-chip">
                    История {index + 1} · {result ? "разобрана" : "предстоит"}
                  </span>
                  <h2>{s.title}</h2>
                  <p>{s.description}</p>
                  {result && (
                    <p>
                      <b>{s.endings[result.endingId].title}</b>
                      <br />
                      {s.endings[result.endingId].message}
                    </p>
                  )}
                  <button
                    className="primary"
                    onClick={() =>
                      onOpenScenario(id, (story, outcome, details) =>
                        setPlan((previous) => {
                          if (!previous) return previous;
                          const next = recordPlanResult(
                            previous,
                            story.id,
                            outcome,
                            details,
                          );
                          if (
                            !learningPlanStore.write({
                              revision: 1,
                              plan: next,
                            })
                          )
                            setNotice(true);
                          return next;
                        }),
                      )
                    }
                  >
                    {result ? "Повторить историю" : "Начать историю"}
                  </button>
                </li>
              );
            })}
          </ol>
          {Object.keys(plan.results).length === 5 && (
            <section className="feature-panel" role="status">
              <h2>Маршрут разобран</h2>
              <p>
                Вы посмотрели пять ситуаций. Сравните приёмы проверки и
                последствия своих решений. Само завершение не означает, что все
                решения были безопасными.
              </p>
              <button
                className="primary"
                onClick={() => onNavigate("diagnostics")}
              >
                Вернуться к проверке навыков
              </button>
            </section>
          )}
          <div className="feature-actions">
            <button className="secondary" onClick={() => setEdit(true)}>
              Изменить план
            </button>
            <button
              className="secondary"
              onClick={() => onNavigate("practice")}
            >
              Начать другую историю
            </button>
            <button
              className="secondary"
              onClick={() =>
                exportFile(
                  "cybershield-plan.json",
                  "application/json",
                  JSON.stringify(
                    {
                      schemaVersion: 1,
                      skillIds: plan.skillIds,
                      scenarioIds: plan.scenarioIds,
                      completedIds: Object.keys(plan.results),
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Экспортировать мой маршрут
            </button>
          </div>
        </>
      )}
      <button className="text-button" onClick={() => setConfirm(true)}>
        Очистить мои рекомендации
      </button>
      {confirm && (
        <div className="feature-notice">
          <p>
            Удалить план и новые счётчики рекомендаций? Диагностика, старый
            прогресс и подборки останутся.
          </p>
          <button
            className="secondary"
            onClick={() => {
              const a = learningPlanStore.clear(),
                b = learningStatsStore.clear();
              setNotice(!a || !b);
              setPlan(null);
              setManual([]);
              setConfirm(false);
            }}
          >
            Подтвердить очистку рекомендаций
          </button>
          <button className="text-button" onClick={() => setConfirm(false)}>
            Отмена
          </button>
        </div>
      )}
    </FeatureFrame>
  );
}
