import { scenarios } from "./scenarios";
import { incidentGuides } from "./emergency-flows";
import { riskRules } from "../features/message-check/rules";
import { references, reviewFor, type ContentReview } from "./references";
export const contentReviews: ContentReview[] = [
  ...scenarios.map((s) => reviewFor(`scenario:${s.id}`, [])),
  ...Object.values(incidentGuides).map((g) =>
    reviewFor(`guide:${g.id}`, g.sourceIds),
  ),
  ...riskRules.map((r) => reviewFor(`rule:${r.id}`, r.sourceIds, r.version)),
];
export function validateContentReviews(rows = contentReviews) {
  if (new Set(rows.map((r) => r.contentId)).size !== rows.length)
    throw Error("Повтор редакционной записи");
  for (const r of rows) {
    if (
      r.revision < 1 ||
      r.referenceIds.some((id) => !references.some((s) => s.id === id))
    )
      throw Error("Неизвестный источник редакционной записи");
    if (
      r.status === "expert-reviewed" &&
      (!r.reviewedAt ||
        !r.reviewerRole ||
        !r.evidence ||
        r.referenceIds.some(
          (id) => references.find((s) => s.id === id)!.status !== "checked",
        ))
    )
      throw Error("Нет основания экспертного статуса");
  }
}
