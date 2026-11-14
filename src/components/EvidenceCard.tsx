import { Bell, FileText, KeyRound, ChevronDown } from "lucide-react";
import type { Evidence } from "../engine";
export function EvidenceCard({
  evidence,
  review = false,
}: {
  evidence: Evidence;
  review?: boolean;
}) {
  const Icon =
    evidence.kind === "notification"
      ? Bell
      : evidence.kind === "permissions"
        ? KeyRound
        : FileText;
  return (
    <details className={`evidence-card evidence-${evidence.kind}`}>
      <summary>
        <span className="evidence-symbol">
          <Icon size={24} />
        </span>
        <span>
          <small>
            {review ? "Материал этого шага" : "Можно изучить перед ответом"}
          </small>
          <b>{evidence.title}</b>
        </span>
        <ChevronDown className="evidence-chevron" size={21} />
      </summary>
      <div className="evidence-content">
        <span className="evidence-stamp">УЧЕБНЫЙ МАТЕРИАЛ</span>
        <dl>
          {evidence.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p>Вымышленный пример. Данные вводить не нужно.</p>
      </div>
    </details>
  );
}
