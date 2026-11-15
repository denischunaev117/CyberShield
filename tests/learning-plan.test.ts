import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makePlan,
  planValid,
  recordPlanResult,
  scoresFromLegacy,
  scoresFromRecent,
} from "../src/features/learning-plan/engine";
import { scenarios } from "../src/content/scenarios";
import { learningStatsValid } from "../src/platform/learning-stats";
test("empty evidence requires a manual choice; one or several priorities make five unique deterministic stories", () => {
  assert.throws(() => makePlan({}, "legacy"));
  for (const scores of [
    { identity: 20 },
    { codes: 0, payee: 30, pressure: 60 },
  ]) {
    const a = makePlan(scores, "recent"),
      b = makePlan(scores, "recent");
    assert.deepEqual(a, b);
    assert.ok(planValid(a));
    assert.equal(a.scenarioIds.length, 5);
    assert.equal(new Set(a.scenarioIds).size, 5);
    const topics = a.scenarioIds.map(
      (id) => scenarios.find((s) => s.id === id)!.topic,
    );
    for (let i = 2; i < 5; i++)
      assert.ok(!(topics[i] === topics[i - 1] && topics[i] === topics[i - 2]));
  }
});
test("recent stories are avoided when alternatives exist, unknown skills and old plans are rejected", () => {
  const first = makePlan({ payee: 0 }, "recent");
  const next = makePlan({ payee: 0 }, "recent", first.scenarioIds);
  assert.ok(next.scenarioIds.some((id) => !first.scenarioIds.includes(id)));
  assert.equal(planValid({ ...first, revision: 99 }), false);
  assert.equal(
    planValid({
      ...first,
      scenarioIds: [...first.scenarioIds.slice(1), first.scenarioIds[1]],
    }),
    false,
  );
});
test("legacy results are explicitly coarse signals, while new counters give bounded aggregates", () => {
  const score = scoresFromLegacy([
    {
      id: "friend-account",
      outcome: "risk",
      completedAt: new Date().toISOString(),
    },
  ]);
  assert.equal(score.identity, 0);
  const stats = {
    revision: 1 as const,
    records: {
      "friend-account": {
        scenarioId: "friend-account",
        outcome: "safe" as const,
        endingId: "verified",
        updatedAt: new Date().toISOString(),
        counts: { safe: 2, caution: 0, risk: 0 },
      },
    },
  };
  assert.ok(learningStatsValid(stats));
  assert.equal(scoresFromRecent(stats).identity, 100);
  assert.equal(learningStatsValid({ ...stats, revision: 2 }), false);
});
test("only real endings complete a route; a replay replaces rather than adds an entry", () => {
  let plan = makePlan({}, "manual", [], ["identity"]);
  const id = plan.scenarioIds[0],
    s = scenarios.find((s) => s.id === id)!;
  let node = s.start;
  const counts = { safe: 0, caution: 0, risk: 0 };
  while (!s.endings[node]) {
    const c = s.nodes[node].choices[0];
    counts[c.assessment]++;
    node = c.next;
  }
  plan = recordPlanResult(plan, id, s.endings[node].outcome, {
    endingId: node,
    counts,
  });
  plan = recordPlanResult(plan, id, s.endings[node].outcome, {
    endingId: node,
    counts,
  });
  assert.equal(Object.keys(plan.results).length, 1);
  assert.throws(() =>
    recordPlanResult(plan, id, "safe", { endingId: "invented", counts }),
  );
});
