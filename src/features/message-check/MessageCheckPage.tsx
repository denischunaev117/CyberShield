import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { analyzeMessage, relatedByRule, type RiskAnalysis } from "./analyze";
import { riskRules } from "./rules";
import { FeatureFrame, ScenarioLinks } from "../shared";
import type { FeatureProps } from "../types";
import { SourceStatus } from "../references/SourceStatus";
export default function MessageCheckPage({
  onNavigate,
  onOpenScenario,
}: FeatureProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<RiskAnalysis | null>(null);
  const [error, setError] = useState("");
  const clear = () => {
    setText("");
    setResult(null);
    setError("");
  };
  const found = result
    ? riskRules.filter((r) => result.ruleIds.includes(r.id))
    : [];
  const related = [
    ...new Set(found.flatMap((r) => relatedByRule[r.id] ?? [])),
  ].slice(0, 3);
  return (
    <FeatureFrame
      title="Проверить сообщение"
      description="Локально находим объяснимые признаки социальной инженерии. Это проверка текста, а не определение личности отправителя или юридического статуса события."
      onNavigate={onNavigate}
    >
      <aside className="privacy-notice">
        <div>
          <h2>Сначала обезличьте текст</h2>
          <p>
            Не вставляйте пароли, реальные SMS-коды, ФИО, номера карт и
            документов, адреса или полную личную переписку. Анализ не отправляет
            текст в сеть и не сохраняет его.
          </p>
          <details>
            <summary>Как обезличить текст</summary>
            <p>
              Замените людей ролями, удалите контакты, числа кодов и параметры
              личных ссылок. Оставьте формулировки просьбы. Автоматическая
              проверка не умеет находить все персональные данные.
            </p>
          </details>
        </div>
      </aside>
      <form
        className="feature-panel no-print"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            setResult(analyzeMessage(text));
            setError("");
          } catch (err) {
            setError((err as Error).message);
            setResult(null);
          }
        }}
      >
        <label htmlFor="message-text">
          <b>Обезличенный текст сообщения</b>
        </label>
        <textarea
          id="message-text"
          value={text}
          maxLength={3000}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          aria-describedby="message-help"
        />
        <p id="message-help">
          {text.length} / 3000 символов. Ссылки не открываются, сайты не
          загружаются.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error} Отредактируйте текст или очистите поле.
          </p>
        )}
        <div className="feature-actions">
          <button className="primary" type="submit">
            <Search size={22} />
            Проверить
          </button>
          <button className="secondary" type="button" onClick={clear}>
            <Trash2 size={22} />
            Очистить
          </button>
        </div>
      </form>
      {result && (
        <section className="analysis-result" aria-label="Результат анализа">
          <h2 tabIndex={-1} ref={(e) => e?.focus()}>
            {result.level === "high"
              ? "Обнаружены признаки риска"
              : result.level === "attention"
                ? "Нужна дополнительная проверка"
                : "Типовые признаки не найдены — это не подтверждает безопасность"}
          </h2>
          <p role="status">
            Найдено признаков: {found.length}. Анализ не доказывает ни
            безопасность сообщения, ни мошеннический характер обращения.
            Возможны пропуски и ложные срабатывания.
          </p>
          {found.length > 0 ? (
            <div className="reference-list">
              {found.map((r) => (
                <article className="feature-panel" key={r.id}>
                  <span className="status-chip">
                    {r.severity === "high"
                      ? "Высокое внимание"
                      : r.severity === "medium"
                        ? "Повышенное внимание"
                        : "Нужен контекст"}
                  </span>
                  <h3>{r.category}</h3>
                  <p>{r.reason}</p>
                  <p>
                    <b>Что сделать безопасно: </b>
                    {r.advice}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="feature-panel">
              <h3>Проверьте обстоятельства независимо</h3>
              <p>
                Сверьте отправителя, полномочия, назначение просьбы и
                получателя. Нейтральный текст тоже может быть частью более
                длинной цепочки.
              </p>
            </div>
          )}
          <div className="feature-actions no-print">
            <button
              className="primary"
              onClick={() => {
                clear();
                onNavigate("emergency");
              }}
            >
              Перейти в помощь
            </button>
            <button className="secondary" onClick={clear}>
              Проверить другой текст
            </button>
          </div>
          <p>
            Если вы уже передали данные или деньги, сначала используйте алгоритм
            помощи. Текст сообщения туда не переносится.
          </p>
          <SourceStatus
            ids={
              [...new Set(found.flatMap((r) => r.sourceIds))].slice(0, 4).length
                ? [...new Set(found.flatMap((r) => r.sourceIds))].slice(0, 4)
                : ["mvd"]
            }
          />
          <ScenarioLinks
            ids={
              related.length
                ? related
                : ["friend-account", "courier-order-real"]
            }
            onOpenScenario={onOpenScenario}
          />
        </section>
      )}
    </FeatureFrame>
  );
}
