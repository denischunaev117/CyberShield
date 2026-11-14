import type { LearningCollection } from "../content/collections";
import type { Scenario } from "../engine";
import type { CollectionRun } from "../collection-engine";
export const collectionStorageKey = "cybershield-collections-v1";
/** Store only result codes, counts and quiz option ids; never conversation text. */
export function readCollectionRuns(
  collections: LearningCollection[],
  scenarios: Scenario[],
): Record<string, CollectionRun> {
  try {
    const data = JSON.parse(localStorage.getItem(collectionStorageKey) || "{}");
    const valid: Record<string, CollectionRun> = {};
    for (const c of collections) {
      const run = data?.[c.id];
      if (
        !run ||
        run.revision !== c.revision ||
        !Number.isFinite(Date.parse(run.startedAt)) ||
        !Array.isArray(run.results) ||
        run.results.length > c.scenarioIds.length
      )
        continue;
      const resultsValid = run.results.every(
        (r: CollectionRun["results"][number], i: number) => {
          const s = scenarios.find((s) => s.id === c.scenarioIds[i]);
          return (
            r &&
            r.scenarioId === s?.id &&
            ["safe", "caution", "risk"].includes(r.outcome) &&
            s?.endings[r.endingId]?.outcome === r.outcome &&
            r.counts &&
            ["safe", "caution", "risk"].every(
              (k) =>
                Number.isInteger(r.counts[k as keyof typeof r.counts]) &&
                r.counts[k as keyof typeof r.counts] >= 0 &&
                r.counts[k as keyof typeof r.counts] <=
                  Object.keys(s!.nodes).length,
            ) &&
            r.counts.safe + r.counts.caution + r.counts.risk > 0 &&
            r.counts.safe + r.counts.caution + r.counts.risk <=
              Object.keys(s!.nodes).length
          );
        },
      );
      if (
        !resultsValid ||
        !run.quiz ||
        !["not-started", "declined", "in-progress", "completed"].includes(
          run.quiz.status,
        ) ||
        typeof run.quiz.answers !== "object" ||
        run.quiz.answers === null ||
        Array.isArray(run.quiz.answers)
      )
        continue;
      const answers = run.quiz.answers as Record<string, string>;
      const answered = Object.keys(answers).length;
      if (
        !Object.entries(answers).every(([id, option]) =>
          c.quiz.find((q) => q.id === id)?.options.some((o) => o.id === option),
        )
      )
        continue;
      if (c.quiz.slice(0, answered).some((q) => !answers[q.id])) continue;
      if (
        run.quiz.status !== "not-started" &&
        run.results.length !== c.scenarioIds.length
      )
        continue;
      if (
        (run.quiz.status === "not-started" && answered > 0) ||
        (run.quiz.status === "completed" && answered !== c.quiz.length) ||
        (run.quiz.status === "in-progress" && answered >= c.quiz.length)
      )
        continue;
      valid[c.id] = {
        revision: c.revision,
        startedAt: run.startedAt,
        results: run.results.map((r: CollectionRun["results"][number]) => ({
          scenarioId: r.scenarioId,
          endingId: r.endingId,
          outcome: r.outcome,
          counts: {
            safe: r.counts.safe,
            caution: r.counts.caution,
            risk: r.counts.risk,
          },
        })),
        quiz: {
          status: run.quiz.status,
          answers: Object.fromEntries(Object.entries(answers)),
        },
      };
    }
    return valid;
  } catch {
    return {};
  }
}
export function saveCollectionRuns(
  runs: Record<string, CollectionRun>,
): boolean {
  try {
    localStorage.setItem(collectionStorageKey, JSON.stringify(runs));
    return true;
  } catch {
    return false;
  }
}
