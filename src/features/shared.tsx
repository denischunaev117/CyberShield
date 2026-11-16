import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { scenarios } from "../content/scenarios";
import type { FeatureProps } from "./types";
import {
  isNativeApp,
  nativeExportFile,
  nativeExportFailure,
} from "../platform/native";
export function FeatureFrame({
  title,
  description,
  children,
  onNavigate,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onNavigate: FeatureProps["onNavigate"];
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [title]);
  return (
    <section className="feature-page">
      <button
        className="text-button no-print feature-back"
        onClick={() => onNavigate("practice")}
      >
        <ArrowLeft size={22} />
        Назад к практике
      </button>
      <div className="eyebrow">КИБЕРЩИТ · ПОЛЕЗНЫЕ ИНСТРУМЕНТЫ</div>
      <h1 tabIndex={-1} ref={heading}>
        {title}
      </h1>
      <p className="page-intro">{description}</p>
      {children}
    </section>
  );
}
export function ScenarioLinks({
  ids,
  onOpenScenario,
}: {
  ids: string[];
  onOpenScenario: FeatureProps["onOpenScenario"];
}) {
  return (
    <section className="related-scenarios no-print">
      <h2>
        <BookOpen size={24} />
        Попробуйте в учебной ситуации
      </h2>
      <div className="feature-card-grid">
        {ids.map((id) => {
          const s = scenarios.find((s) => s.id === id);
          return s ? (
            <button
              className="feature-card"
              key={id}
              onClick={() => onOpenScenario(id)}
            >
              <b>{s.title}</b>
              <span>{s.topic}</span>
              <ArrowRight size={22} />
            </button>
          ) : null;
        })}
      </div>
    </section>
  );
}
export function StorageNotice({ failed }: { failed: boolean }) {
  return failed ? (
    <p className="feature-notice" role="status">
      Браузер не разрешил сохранить результат. Он доступен только в текущей
      вкладке.
    </p>
  ) : null;
}
export function exportFile(name: string, type: string, data: string) {
  if (isNativeApp()) {
    void nativeExportFile(name, type, data).catch(nativeExportFailure);
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
