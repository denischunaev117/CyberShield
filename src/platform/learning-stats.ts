import type { CompletionDetails, Outcome } from "../collection-engine";
import { scenarios } from "../content/scenarios";
import { localStore, isObject, exactKeys, countsValid } from "./local-store";
export type LearningStat = CompletionDetails & {
  scenarioId: string;
  outcome: Outcome;
  updatedAt: string;
};
export type LearningStats = {
  revision: 1;
  records: Record<string, LearningStat>;
};
export function learningStatsValid(v: unknown): v is LearningStats {
  if (
    !isObject(v) ||
    v.revision !== 1 ||
    !exactKeys(v, ["revision", "records"]) ||
    !isObject(v.records) ||
    Object.keys(v.records).length > 100
  )
    return false;
  return Object.entries(v.records).every(([id, s]) => {
    const story = scenarios.find((s) => s.id === id);
    if (
      !story ||
      !isObject(s) ||
      !exactKeys(s, [
        "scenarioId",
        "outcome",
        "updatedAt",
        "endingId",
        "counts",
      ]) ||
      s.scenarioId !== id ||
      typeof s.endingId !== "string" ||
      !["safe", "caution", "risk"].includes(s.outcome as string) ||
      story.endings[s.endingId]?.outcome !== s.outcome ||
      typeof s.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(s.updatedAt)) ||
      !isObject(s.counts) ||
      !exactKeys(s.counts, ["safe", "caution", "risk"])
    )
      return false;
    return countsValid(s.counts);
  });
}
export const learningStatsStore = localStore<LearningStats>(
  "cybershield-learning-stats-v1",
  learningStatsValid,
  () => ({ revision: 1, records: {} }),
);
export function recordLearningStat(
  scenarioId: string,
  outcome: Outcome,
  details: CompletionDetails,
) {
  const previous = learningStatsStore.read();
  return learningStatsStore.write({
    revision: 1,
    records: {
      ...previous.records,
      [scenarioId]: {
        scenarioId,
        outcome,
        ...details,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}
