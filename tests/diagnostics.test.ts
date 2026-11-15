import { test } from "node:test";
import assert from "node:assert/strict";
import { diagnosticQuestions } from "../src/content/diagnostic-questions";
import {
  validateDiagnosticQuestions,
  newDiagnostic,
  diagnosticValid,
  formQuestions,
  initialForm,
  finalForm,
  answerDiagnostic,
  startPost,
  scoreForm,
  diagnosticSummary,
  diagnosticExport,
  answerFollowUp,
  type DiagnosticRun,
} from "../src/features/diagnostics/engine";
import { localStore } from "../src/platform/local-store";
function complete(run: DiagnosticRun, points: number) {
  for (const q of formQuestions(
    run.stage === "pre" ? initialForm(run) : finalForm(run),
  )) {
    const o = q.options.find((o) => o.points === points) ?? q.options[0];
    run = answerDiagnostic(run, q.id, o.id);
  }
  return run;
}
test("24 novel paired questions have comparable skills/difficulty and multiple safe alternatives", () => {
  validateDiagnosticQuestions();
  assert.equal(diagnosticQuestions.length, 24);
  assert.ok(
    diagnosticQuestions.some(
      (q) => q.options.filter((o) => o.points === 2).length > 1,
    ),
  );
});
test("both form orders work and incomplete forms never receive a score", () => {
  for (const seed of [0, 1]) {
    let r = newDiagnostic(seed, "12345678-abcd");
    assert.ok(diagnosticValid(r));
    assert.notEqual(initialForm(r), finalForm(r));
    assert.equal(scoreForm(initialForm(r), r.pre), null);
    assert.equal(diagnosticSummary(r).changePp, null);
    r = complete(r, 2);
    assert.equal(r.stage, "practice");
    assert.equal(diagnosticSummary(r).pre?.score, 100);
    assert.equal(diagnosticSummary(r).changePp, null);
    r = complete(startPost(r), 2);
    assert.equal(r.stage, "complete");
    assert.equal(diagnosticSummary(r).changePp, 0);
    assert.ok(diagnosticValid(r));
  }
});
test("negative and zero changes are percentage points and exporting omits IDs and answers", () => {
  let r = complete(newDiagnostic(0, "12345678-abcd"), 2);
  r = complete(startPost(r), 0);
  const s = diagnosticSummary(r);
  assert.equal(s.changePp, -100);
  const out = JSON.stringify(diagnosticExport(r));
  assert.ok(!out.includes(r.runId));
  assert.ok(!out.includes("o1"));
  assert.ok(!out.includes("startedAt"));
  assert.ok(!out.includes("seed"));
});
test("invalid revisions, cross-form answers, impossible completed stages and wrong pairs are rejected", () => {
  const r = newDiagnostic(0, "12345678-abcd");
  assert.equal(diagnosticValid({ ...r, revision: 2 }), false);
  assert.equal(diagnosticValid({ ...r, stage: "complete" }), false);
  assert.equal(
    diagnosticValid({ ...r, pre: { [formQuestions("B")[0].id]: "o1" } }),
    false,
  );
  assert.throws(() => startPost(r));
  assert.throws(() => answerDiagnostic(r, "B-known-person", "o1"));
  const q = structuredClone(diagnosticQuestions);
  q.find((q) => q.form === "B")!.difficulty = "advanced";
  assert.throws(() => validateDiagnosticQuestions(q));
});
test("follow-up is separate from the unchanged original pre/post summary", () => {
  let r = complete(
    startPost(complete(newDiagnostic(1, "12345678-abcd"), 2)),
    0,
  );
  const before = diagnosticSummary(r);
  r = {
    ...r,
    followUp: { form: "A", answers: {}, cursor: 0, complete: false },
  };
  for (const q of formQuestions("A"))
    r = answerFollowUp(r, q.id, q.options.find((o) => o.points === 2)!.id);
  assert.equal(r.followUp!.complete, true);
  assert.deepEqual(diagnosticSummary(r), before);
  assert.ok(diagnosticValid(r));
});
test("new storage falls back to memory on refusal and ignores old/corrupt values without touching legacy keys", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map<string, string>([["cybershield-progress-v1", "legacy"]]);
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => data.set(k, v),
        removeItem: (k: string) => data.delete(k),
      },
    });
    const store = localStore(
      "new-key",
      (v): v is DiagnosticRun => diagnosticValid(v),
      () => newDiagnostic(0, "12345678-abcd"),
    );
    data.set("new-key", '{"revision":999}');
    assert.equal(store.read().stage, "pre");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem() {
          throw Error("denied");
        },
        setItem() {
          throw Error("denied");
        },
        removeItem() {
          throw Error("denied");
        },
      },
    });
    const r = complete(newDiagnostic(1, "12345678-abcd"), 2);
    assert.equal(store.write(r), false);
    assert.deepEqual(store.read(), r);
    assert.equal(data.get("cybershield-progress-v1"), "legacy");
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
