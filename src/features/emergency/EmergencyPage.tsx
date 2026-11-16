import { translateText } from "../../i18n/core";
import { useState } from "react";
import { Printer, RotateCcw, ArrowLeft, Copy } from "lucide-react";
import {
  incidentTopics,
  incidentRoots,
  incidentNodes,
  incidentGuides,
} from "../../content/emergency-flows";
import type { FeatureProps } from "../types";
import { FeatureFrame, ScenarioLinks } from "../shared";
import { SourceStatus } from "../references/SourceStatus";
import {
  isNativeApp,
  nativePrint,
  nativePrintFailure,
} from "../../platform/native";
export default function EmergencyPage({
  onNavigate,
  onOpenScenario,
}: FeatureProps) {
  const [path, setPath] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);
  const [copied, setCopied] = useState("");
  const id = path.at(-1),
    node = id ? incidentNodes[id] : undefined,
    guide = id ? incidentGuides[id] : undefined;
  const reset = () => {
    setPath([]);
    setStopped(false);
    setCopied("");
  };
  const blocks = guide
    ? ([
        ["Сделайте сейчас", guide.stepsNow],
        ["Затем", guide.stepsLater],
        ["Сохраните доказательства", guide.evidence],
        ["Что не делать", guide.avoid],
      ] as const)
    : [];
  return (
    <FeatureFrame
      title="Мне нужна помощь"
      description="Выберите, что произошло, и получите справочный план действий. Ответы остаются только в этом разделе и не сохраняются."
      onNavigate={onNavigate}
    >
      <aside className="feature-notice no-print">
        При непосредственной угрозе жизни или здоровью обращайтесь в профильные
        экстренные службы. Этот помощник не заменяет официальную помощь, не
        блокирует карты и не подтверждает устранение ущерба.
      </aside>
      {stopped ? (
        <div className="feature-panel">
          <h2>Помощник остановлен</h2>
          <p>
            Ответы очищены. Вы можете вернуться к общим рекомендациям или начать
            заново.
          </p>
          <button className="primary" onClick={reset}>
            Начать заново
          </button>
        </div>
      ) : !id ? (
        <div className="feature-card-grid">
          {incidentTopics.map((t) => (
            <button
              key={t.id}
              className="feature-card"
              onClick={() => setPath([incidentRoots[t.id]])}
            >
              <b>{t.title}</b>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="feature-actions no-print">
            <button
              className="secondary"
              onClick={() => {
                setPath((p) => p.slice(0, -1));
                setCopied("");
              }}
            >
              <ArrowLeft size={22} />
              Назад
            </button>
            <button className="text-button" onClick={reset}>
              <RotateCcw size={22} />
              Начать заново
            </button>
            <button
              className="text-button"
              onClick={() => {
                setPath([]);
                setStopped(true);
              }}
            >
              Остановить помощник
            </button>
          </div>
          {node ? (
            <section className="feature-panel question-panel" key={node.id}>
              <h2 tabIndex={-1} ref={(e) => e?.focus()}>
                {node.question}
              </h2>
              <div className="answer-options">
                {node.answers.map((a) => (
                  <button
                    className="secondary"
                    key={a.id}
                    onClick={() => setPath((p) => [...p, a.next])}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            </section>
          ) : guide ? (
            <>
              <article className="print-sheet incident-result">
                <h2 tabIndex={-1} ref={(e) => e?.focus()}>
                  {guide.title}
                </h2>
                <p className="feature-lead">{guide.intro}</p>
                {blocks.map(([title, items]) => (
                  <section className="feature-panel" key={title}>
                    <h3>{title}</h3>
                    <ol>
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>
                ))}
                <section className="feature-panel">
                  <h3>Где проверять официальные контакты</h3>
                  <p>
                    Используйте номер на вашей карте, ранее установленное
                    официальное приложение или самостоятельно найденный
                    официальный сайт организации. Не используйте номер, который
                    прислал подозрительный собеседник.
                  </p>
                </section>
                <SourceStatus ids={guide.sourceIds} />
              </article>
              <div className="feature-actions no-print">
                <button
                  className="secondary"
                  onClick={() => {
                    if (isNativeApp())
                      void nativePrint().catch(nativePrintFailure);
                    else window.print();
                  }}
                >
                  <Printer size={22} />
                  Распечатать инструкцию
                </button>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        [
                          guide.title,
                          guide.intro,
                          ...blocks.flatMap(([t, items]) => [t, ...items]),
                        ]
                          .map(translateText)
                          .join("\n"),
                      );
                      setCopied(
                        "Общие инструкции скопированы. История ответов не включена.",
                      );
                    } catch {
                      setCopied(
                        "Копирование недоступно. Можно распечатать инструкцию.",
                      );
                    }
                  }}
                >
                  <Copy size={22} />
                  Копировать инструкцию
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    reset();
                    onNavigate("practice");
                  }}
                >
                  Завершить чтение
                </button>
              </div>
              <p role="status">{copied}</p>
              <ScenarioLinks
                ids={guide.relatedScenarioIds}
                onOpenScenario={onOpenScenario}
              />
            </>
          ) : null}
        </>
      )}
    </FeatureFrame>
  );
}
