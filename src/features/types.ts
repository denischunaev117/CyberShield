import type { Scenario } from "../engine";
import type { CompletionDetails, Outcome } from "../collection-engine";
export type FeaturePage =
  | "emergency"
  | "message-check"
  | "diagnostics"
  | "classroom"
  | "learning-plan"
  | "references";
export type PageId =
  FeaturePage | "practice" | "collections" | "progress" | "guide" | "share";
export type ScenarioCompletion = (
  scenario: Scenario,
  outcome: Outcome,
  details: CompletionDetails,
) => void;
export type FeatureProps = {
  onNavigate: (page: PageId) => void;
  onOpenScenario: (id: string, complete?: ScenarioCompletion) => void;
};
export const pageNames: Record<PageId, string> = {
  practice: "Практика",
  collections: "Подборки",
  progress: "Мой прогресс",
  guide: "Памятка",
  share: "Ваша история",
  emergency: "Мне нужна помощь",
  "message-check": "Проверить сообщение",
  diagnostics: "Диагностика",
  classroom: "Для занятий",
  "learning-plan": "Мой план",
  references: "Источники",
};
