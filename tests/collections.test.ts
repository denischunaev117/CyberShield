import { test } from "node:test";
import assert from "node:assert/strict";
import { collections } from "../src/content/collections";
import { scenarios } from "../src/content/scenarios";
import {
  freshRun,
  recordResult,
  answerQuiz,
  quizScore,
  collectionReport,
  validateCollection,
  type CollectionResult,
} from "../src/collection-engine";
import {
  readCollectionRuns,
  saveCollectionRuns,
  collectionStorageKey,
} from "../src/platform/collections";
import { scenarioAudience } from "../src/content/audiences";
function result(id: string): CollectionResult {
  const s = scenarios.find((s) => s.id === id)!;
  let node = s.start;
  const counts = { safe: 0, caution: 0, risk: 0 };
  while (!s.endings[node]) {
    const c = s.nodes[node].choices[0];
    counts[c.assessment]++;
    node = c.next;
  }
  return {
    scenarioId: id,
    endingId: node,
    outcome: s.endings[node].outcome,
    counts,
  };
}
function finished(c = collections[0]) {
  return c.scenarioIds.reduce(
    (r, id) => recordResult(c, r, result(id)),
    freshRun(c),
  );
}
for (const c of collections)
  test(`${c.id}: ten existing stories, genuine counterexamples and a valid optional quiz`, () => {
    validateCollection(c, scenarios);
    assert.equal(c.scenarioIds.length, 10);
    assert.ok(
      c.scenarioIds.some(
        (id) => scenarios.find((s) => s.id === id)?.reality === "legitimate",
      ),
    );
  });
test("out-of-order results cannot skip stories; replay replaces rather than adds a story", () => {
  const c = collections[0];
  const run = freshRun(c);
  assert.throws(() => recordResult(c, run, result(c.scenarioIds[1])));
  const once = recordResult(c, run, result(c.scenarioIds[0]));
  const twice = recordResult(c, once, result(c.scenarioIds[0]));
  assert.equal(twice.results.length, 1);
  assert.equal(
    recordResult(c, twice, result(c.scenarioIds[1])).results.length,
    2,
  );
});
test("quiz cannot run before completion and rejected answers do not advance it", () => {
  const c = collections[0];
  const partial = freshRun(c);
  assert.throws(() =>
    answerQuiz(c, partial, c.quiz[0].id, c.quiz[0].correctId),
  );
  const ready = {
    ...finished(c),
    quiz: { status: "in-progress" as const, answers: {} },
  };
  assert.throws(() => answerQuiz(c, ready, c.quiz[1].id, c.quiz[1].correctId));
  assert.throws(() => answerQuiz(c, ready, c.quiz[0].id, "invented"));
  assert.deepEqual(ready.quiz.answers, {});
});
test("declining quiz preserves full completion and exposes no invented test score", () => {
  const c = collections[0];
  const done = finished(c);
  const declined = {
    ...done,
    quiz: { status: "declined" as const, answers: {} },
  };
  assert.equal(collectionReport(declined).completed, 10);
  assert.equal(quizScore(c, declined), null);
  assert.deepEqual(declined.results, done.results);
});
test("a full quiz scores correct and incorrect submitted answers and supports independent replay", () => {
  const c = collections[0];
  let run = {
    ...finished(c),
    quiz: {
      status: "in-progress" as const,
      answers: {} as Record<string, string>,
    },
  };
  let current = run as ReturnType<typeof finished>;
  for (const [i, q] of c.quiz.entries()) {
    current = answerQuiz(
      c,
      current,
      q.id,
      i === 0 ? q.options.find((o) => o.id !== q.correctId)!.id : q.correctId,
    );
    if (i < c.quiz.length - 1) assert.equal(quizScore(c, current), null);
  }
  assert.deepEqual(quizScore(c, current), { correct: 2, total: 3 });
  assert.equal(current.results.length, 10);
  run = { ...current, quiz: { status: "in-progress", answers: {} } };
  assert.equal(run.results.length, 10);
  assert.equal(quizScore(c, run), null);
});
test("summary distinguishes risky choices from consequences that remain after a safe stop", () => {
  const run = finished(collections[1]);
  assert.ok(collectionReport(run).cautiousOutcomes >= 1);
  assert.equal(collectionReport(run).completed, 10);
  assert.ok(
    run.results.some((r) => r.outcome === "caution" && r.counts.risk === 0),
  );
});
test("collection validator rejects unknown stories, duplicates and broken quiz answers", () => {
  for (const mutate of [
    (c: (typeof collections)[number]) => {
      c.scenarioIds[0] = "missing";
    },
    (c: (typeof collections)[number]) => {
      c.scenarioIds[1] = c.scenarioIds[0];
    },
    (c: (typeof collections)[number]) => {
      c.quiz[0].correctId = "missing";
    },
  ]) {
    const c = structuredClone(collections[0]);
    mutate(c);
    assert.throws(() => validateCollection(c, scenarios));
  }
});
function storageMock() {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  return memory;
}
test("saved partial routes and quiz answers resume with result codes only", () => {
  storageMock();
  const c = collections[0];
  const partial = recordResult(c, freshRun(c), result(c.scenarioIds[0]));
  assert.equal(saveCollectionRuns({ [c.id]: partial }), true);
  assert.deepEqual(readCollectionRuns(collections, scenarios)[c.id], partial);
  let full = {
    ...finished(c),
    quiz: { status: "in-progress" as const, answers: {} },
  };
  full = answerQuiz(c, full, c.quiz[0].id, c.quiz[0].correctId) as typeof full;
  saveCollectionRuns({ [c.id]: full });
  assert.deepEqual(
    readCollectionRuns(collections, scenarios)[c.id].quiz.answers,
    full.quiz.answers,
  );
  assert.doesNotMatch(
    localStorage.getItem(collectionStorageKey)!,
    /message|scammer_reply|explanation|title/,
  );
});
test("malformed storage is rejected without replacing unrelated valid routes", () => {
  const memory = storageMock();
  const first = collections[0],
    second = collections[1];
  const valid = recordResult(
    first,
    freshRun(first),
    result(first.scenarioIds[0]),
  );
  memory.set(
    collectionStorageKey,
    JSON.stringify({
      [first.id]: valid,
      [second.id]: {
        ...freshRun(second),
        results: [{ ...result(second.scenarioIds[0]), outcome: "invented" }],
      },
    }),
  );
  assert.deepEqual(Object.keys(readCollectionRuns(collections, scenarios)), [
    first.id,
  ]);
  memory.set(collectionStorageKey, "broken");
  assert.deepEqual(readCollectionRuns(collections, scenarios), {});
});
test("stale revisions, invalid endings and prematurely completed quizzes cannot masquerade as a completed route", () => {
  const memory = storageMock();
  const c = collections[0];
  const good = recordResult(c, freshRun(c), result(c.scenarioIds[0]));
  for (const bad of [
    { ...good, revision: 999 },
    { ...good, results: [{ ...good.results[0], endingId: "missing" }] },
    { ...good, quiz: { status: "completed", answers: {} } },
  ]) {
    memory.set(collectionStorageKey, JSON.stringify({ [c.id]: bad }));
    assert.deepEqual(readCollectionRuns(collections, scenarios), {});
  }
});
test("denied persistence reports failure; demographic labels are contextual recommendations", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    },
  });
  assert.deepEqual(readCollectionRuns(collections, scenarios), {});
  assert.equal(saveCollectionRuns({}), false);
  for (const s of scenarios) {
    const audience = scenarioAudience(s);
    assert.ok(audience.label.length > 8 && audience.reason.length > 15);
    assert.doesNotMatch(audience.label, /наиболее уязвим|больше всего жертв/i);
  }
});
