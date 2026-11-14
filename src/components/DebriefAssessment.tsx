import { ShieldCheck, ShieldX, TriangleAlert } from "lucide-react";
import { assessDebrief } from "../debrief";
import type { Scenario, Step } from "../engine";

export function OutcomeStatus({
  scenario,
  endingId,
  steps,
}: {
  scenario: Scenario;
  endingId: string;
  steps: Step[];
}) {
  const result = assessDebrief(scenario, endingId, steps);
  const Icon =
    result.tone === "danger"
      ? ShieldX
      : result.tone === "warning"
        ? TriangleAlert
        : ShieldCheck;
  return (
    <div
      className={`outcome-status ${result.tone}`}
      role="status"
      aria-atomic="true"
    >
      <Icon size={36} />
      <div>
        <span>ИТОГ ВАШИХ ДЕЙСТВИЙ</span>
        <strong>{result.label}</strong>
      </div>
    </div>
  );
}
export function DebriefAssessment({
  scenario,
  endingId,
  steps,
}: {
  scenario: Scenario;
  endingId: string;
  steps: Step[];
}) {
  const result = assessDebrief(scenario, endingId, steps);
  if (!result.needsReview) return null;
  const items = result.mistakes.length ? result.mistakes : result.incomplete;
  return (
    <>
      <section
        className={`mistake-review ${result.tone}`}
        aria-label="Ошибки и способы исправления"
      >
        <h3>
          {result.mistakes.length
            ? `Где вы ошиблись: ${result.mistakes.length}`
            : "Где проверки оказалось недостаточно"}
        </h3>
        {items.length ? (
          <ol>
            {items.map((item) => (
              <li key={item.number}>
                <span className="error-step">
                  {item.choice.assessment === "risk"
                    ? "Ошибка"
                    : "Недостаточная проверка"}{" "}
                  · шаг {item.number}
                </span>
                <h4>Вы выбрали: «{item.choice.text}»</h4>
                <p>
                  <b>
                    {item.choice.assessment === "risk"
                      ? "Почему это неправильно: "
                      : "Чего не хватило для проверки: "}
                  </b>
                  {item.choice.explanation}
                </p>
                {item.alternatives.length > 0 && (
                  <div className="better-action">
                    <b>Как следовало поступить</b>
                    <ul>
                      {item.alternatives.slice(0, 2).map((c) => (
                        <li key={c.id}>{c.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>
            Обратите внимание на последствие, указанное выше: его нужно
            проверить и устранить, прежде чем считать ситуацию завершённой.
          </p>
        )}
        <p className="learning-reminder">
          В учебной ситуации реальные деньги и данные не передавались. В жизни
          такое действие может привести к потере денег, доступа или другим
          последствиям, указанным в разборе.
        </p>
      </section>
      <section
        className="recovery-actions"
        aria-label="Что делать после такой ошибки"
      >
        <h3>Что делать, если это произошло в жизни</h3>
        <ol>
          {result.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
