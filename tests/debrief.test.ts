import { test } from "node:test";
import assert from "node:assert/strict";
import { scenarios } from "../src/content/scenarios";
import { assessDebrief, recoveryKinds } from "../src/debrief";
import type { Step } from "../src/engine";

for (const s of scenarios)
  test(`${s.id}: all endings identify actual errors, consequences and safer alternatives`, () => {
    assert.ok(recoveryKinds.has(s.id));
    function walk(node: string, steps: Step[]) {
      if (s.endings[node]) {
        const report = assessDebrief(s, node, steps);
        assert.ok(report.actions.length >= 3);
        if (s.endings[node].outcome === "risk") {
          assert.equal(report.tone, "danger");
          assert.match(report.label, /ошибка/);
          assert.ok(report.mistakes.length > 0);
        }
        if (
          s.endings[node].outcome === "caution" &&
          steps.some((step) => step.choice.assessment === "risk")
        ) {
          assert.equal(report.tone, "danger");
          assert.match(report.label, /Последствия остаются/);
        }
        for (const mistake of report.mistakes) {
          assert.equal(steps[mistake.number - 1].choice.id, mistake.choice.id);
          assert.ok(mistake.alternatives.length > 0, `${s.id}/${mistake.node}`);
          assert.ok(mistake.alternatives.every((c) => c.assessment === "safe"));
        }
        return;
      }
      for (const choice of s.nodes[node].choices)
        walk(choice.next, [...steps, { node, choice }]);
    }
    walk(s.start, []);
  });
test("two payments retain both mistakes; stopping after the first payment retains the damage", () => {
  const s = scenarios.find((s) => s.id === "call-secret-operation")!;
  const first = { node: "start", choice: s.nodes.start.choices[2] };
  const more = { node: "transferred", choice: s.nodes.transferred.choices[1] };
  const report = assessDebrief(s, more.choice.next, [first, more]);
  assert.equal(report.mistakes.length, 2);
  assert.equal(report.tone, "danger");
  const stop = { node: "transferred", choice: s.nodes.transferred.choices[0] };
  assert.equal(
    assessDebrief(s, stop.choice.next, [first, stop]).tone,
    "danger",
  );
});
