import { scenarios } from "../../content/scenarios";
import { scenarioSkills } from "../../content/scenario-skills";
import { skillIds, type SkillId } from "../../content/skills";
import type { Outcome, CompletionDetails } from "../../collection-engine";
import type { LearningStats } from "../../platform/learning-stats";
import type { ProgressRecord } from "../../platform/progress";
import { exactKeys, isObject, countsValid } from "../../platform/local-store";
export type SkillScores = Partial<Record<SkillId, number>>;
export type Plan = {
  revision: 1;
  id: string;
  source: "diagnostic-pre" | "diagnostic-post" | "recent" | "legacy" | "manual";
  skillIds: SkillId[];
  scenarioIds: string[];
  results: Record<string, CompletionDetails & { outcome: Outcome }>;
};
export function scoresFromRecent(stats: LearningStats): SkillScores {
  const sums: Partial<Record<SkillId, { points: number; max: number }>> = {};
  for (const r of Object.values(stats.records))
    for (const skill of scenarioSkills[r.scenarioId]) {
      const s = sums[skill] ?? { points: 0, max: 0 };
      s.points += r.counts.safe * 2 + r.counts.caution;
      s.max += 2 * (r.counts.safe + r.counts.caution + r.counts.risk);
      sums[skill] = s;
    }
  return Object.fromEntries(
    Object.entries(sums)
      .filter(([, s]) => s!.max > 0)
      .map(([id, s]) => [id, (100 * s!.points) / s!.max]),
  );
}
export function scoresFromLegacy(records: ProgressRecord[]): SkillScores {
  const latest = new Map<string, ProgressRecord>();
  for (const r of records) latest.set(r.id, r);
  const sums: Partial<Record<SkillId, { points: number; n: number }>> = {};
  for (const r of latest.values())
    for (const id of scenarioSkills[r.id] ?? []) {
      const s = sums[id] ?? { points: 0, n: 0 };
      s.points += r.outcome === "safe" ? 100 : r.outcome === "caution" ? 50 : 0;
      s.n++;
      sums[id] = s;
    }
  return Object.fromEntries(
    Object.entries(sums).map(([id, s]) => [id, s!.points / s!.n]),
  );
}
export function makePlan(
  scores: SkillScores,
  source: Plan["source"],
  recentIds: string[] = [],
  manual: SkillId[] = [],
): Plan {
  if (
    Object.entries(scores).some(
      ([id, s]) =>
        !skillIds.includes(id as SkillId) ||
        !Number.isFinite(s) ||
        s! < 0 ||
        s! > 100,
    )
  )
    throw Error("Неверные показатели навыков");
  if (manual.some((s) => !skillIds.includes(s)))
    throw Error("Неизвестный навык");
  const weakest = (
    manual.length
      ? [...new Set(manual)]
      : Object.entries(scores)
          .sort((a, b) => a[1]! - b[1]! || a[0].localeCompare(b[0]))
          .map(([id]) => id as SkillId)
  ).slice(0, 3);
  if (!weakest.length)
    throw Error("Сначала выберите навык или пройдите диагностику");
  const recent = new Set(recentIds),
    chosen: string[] = [];
  const ranked = scenarios
    .map((s) => ({
      s,
      score:
        weakest.reduce(
          (n, id, i) =>
            n + (scenarioSkills[s.id].includes(id) ? 30 - i * 5 : 0),
          0,
        ) - (recent.has(s.id) ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id));
  for (let i = 0; i < 5; i++) {
    const last = chosen
      .slice(-2)
      .map((id) => scenarios.find((s) => s.id === id)!.topic);
    const available = ranked.filter((x) => !chosen.includes(x.s.id));
    const fresh = available.filter((x) => !recent.has(x.s.id));
    const pool = fresh.length >= 5 - i ? fresh : available;
    const next =
      pool.find(
        (x) => last.length < 2 || last[0] !== last[1] || x.s.topic !== last[0],
      ) ??
      available.find(
        (x) => last.length < 2 || last[0] !== last[1] || x.s.topic !== last[0],
      ) ??
      available[0];
    if (!next) throw Error("Недостаточно историй");
    chosen.push(next.s.id);
  }
  return {
    revision: 1,
    id: `plan-${weakest.join("-")}-${chosen.join("_")}`,
    source,
    skillIds: weakest,
    scenarioIds: chosen,
    results: {},
  };
}
export function planValid(v: unknown): v is Plan {
  if (
    !isObject(v) ||
    !exactKeys(v, [
      "revision",
      "id",
      "source",
      "skillIds",
      "scenarioIds",
      "results",
    ]) ||
    v.revision !== 1 ||
    typeof v.id !== "string" ||
    v.id.length > 600 ||
    ![
      "diagnostic-pre",
      "diagnostic-post",
      "recent",
      "legacy",
      "manual",
    ].includes(v.source as string) ||
    !Array.isArray(v.skillIds) ||
    v.skillIds.length < 1 ||
    v.skillIds.length > 3 ||
    new Set(v.skillIds).size !== v.skillIds.length ||
    v.skillIds.some((id) => !skillIds.includes(id)) ||
    !Array.isArray(v.scenarioIds) ||
    v.scenarioIds.length !== 5 ||
    new Set(v.scenarioIds).size !== 5 ||
    v.scenarioIds.some((id) => !scenarios.some((s) => s.id === id)) ||
    !isObject(v.results)
  )
    return false;
  return Object.entries(v.results).every(([id, result]) => {
    if (
      !(v.scenarioIds as string[]).includes(id) ||
      !isObject(result) ||
      !exactKeys(result, ["endingId", "counts", "outcome"]) ||
      typeof result.endingId !== "string" ||
      !["safe", "caution", "risk"].includes(result.outcome as string) ||
      scenarios.find((s) => s.id === id)!.endings[result.endingId]?.outcome !==
        result.outcome ||
      !isObject(result.counts) ||
      !exactKeys(result.counts, ["safe", "caution", "risk"])
    )
      return false;
    return countsValid(result.counts);
  });
}
export function recordPlanResult(
  plan: Plan,
  id: string,
  outcome: Outcome,
  details: CompletionDetails,
): Plan {
  if (!plan.scenarioIds.includes(id)) throw Error("История вне маршрута");
  const next = {
    ...plan,
    results: { ...plan.results, [id]: { outcome, ...details } },
  };
  if (!planValid(next)) throw Error("Неверный итог маршрута");
  return next;
}
