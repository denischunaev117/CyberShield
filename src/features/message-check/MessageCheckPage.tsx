import { useEffect, useRef, useState } from "react";
import { Search, Trash2, TriangleAlert } from "lucide-react";
import {
  analyzeMessage,
  relatedByRule,
  riskCombinations,
  type RiskAnalysis,
} from "./analyze";
import { riskRules, ruleExcerpt } from "./rules";
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
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!result) return;
    resultHeading.current?.focus({ preventScroll: true });
    resultHeading.current
      ?.closest(".analysis-result")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [result]);
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
      description="Проверяем прямые просьбы и косвенные сигналы: деньги «до завтра», цифры звонка, поддельные выплаты, вход по QR и давление. Текст остаётся на вашем устройстве."
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
          placeholder="Например: «Привет, выручишь до завтра? Не звони, я на совещании»"
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
        <section
          className={`analysis-result analysis-${result.level}`}
          aria-label="Результат анализа"
        >
          <div className="analysis-summary">
            <TriangleAlert size={32} aria-hidden="true" />
            <h2 tabIndex={-1} ref={resultHeading}>
              {result.level === "high"
                ? "Обнаружены признаки риска"
                : result.level === "attention"
                  ? "Есть настораживающие признаки"
                  : "Типовые признаки не найдены — это не подтверждает безопасность"}
            </h2>
            <p>
              {result.level === "none"
                ? "Не считайте сообщение проверенным. Если от вас ждут действия, независимо проверьте отправителя и его просьбу."
                : "Сделайте паузу. Не переводите деньги, не раскрывайте секреты и не выполняйте инструкции до независимой проверки."}
            </p>
          </div>
          <p role="status">
            Найдено признаков: {found.length}. Анализ не доказывает ни
            безопасность сообщения, ни мошеннический характер обращения.
            Возможны пропуски и ложные срабатывания.
          </p>
          {result.combinationIds.length > 0 && (
            <div className="feature-panel analysis-combinations">
              <h3>Особенно опасное сочетание</h3>
              <ul>
                {riskCombinations
                  .filter((c) => result.combinationIds.includes(c.id))
                  .map((c) => (
                    <li key={c.id}>{c.title}</li>
                  ))}
              </ul>
              <p>
                Несколько признаков усиливают повод остановиться. Это не процент
                вероятности и не доказательство обмана.
              </p>
            </div>
          )}
          {found.length > 0 ? (
            <div className="reference-list">
              {found.map((r) => (
                <article
                  className={`feature-panel analysis-signal signal-${r.severity}`}
                  key={r.id}
                >
                  <span className="status-chip">
                    {r.severity === "high"
                      ? "Опасный признак"
                      : r.severity === "medium"
                        ? "Настораживающий признак"
                        : "Косвенный сигнал — проверьте контекст"}
                  </span>
                  <h3>{r.category}</h3>
                  <blockquote className="analysis-excerpt">
                    <span>Фрагмент сообщения</span>
                    <p data-i18n="off">{ruleExcerpt(text, r)}</p>
                  </blockquote>
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
            revision={2}
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
