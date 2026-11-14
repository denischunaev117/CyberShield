import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, validateScenario, type Scenario } from "../src/engine";
import { scenarios } from "../src/content/scenarios";
for (const scenario of scenarios) {
  test(`${scenario.id}: every branch has 3+ choices, valid transitions and a reachable ending`, () =>
    validateScenario(scenario));
  test(`${scenario.id}: every complete path retains explanations and terminates`, () => {
    let paths = 0;
    function walk(node: string, depth: number) {
      assert.ok(depth < 10);
      if (scenario.endings[node]) {
        paths++;
        assert.ok(scenario.endings[node].message.length > 20);
        return;
      }
      for (const c of scenario.nodes[node].choices) {
        assert.ok(c.explanation.length > 20);
        assert.equal(advance(scenario, node, c.id).next, c.next);
        walk(c.next, depth + 1);
      }
    }
    walk(scenario.start, 0);
    assert.ok(paths >= 3);
  });
}
test("genuine requests can have three reasonable choices without one forced right answer", () => {
  const s = scenarios.find((s) => s.reality === "legitimate")!;
  assert.equal(
    s.nodes.verified.choices.filter((c) => c.assessment === "safe").length,
    3,
  );
  assert.equal(new Set(s.nodes.verified.choices.map((c) => c.next)).size, 3);
});
test("invalid choices cannot advance", () =>
  assert.throws(() => advance(scenarios[0], "hello", "invented")));
test("validator rejects fewer than 3 answers, missing transitions and cycles", () => {
  for (const mutate of [
    (s: Scenario) => {
      s.nodes.hello.choices.pop();
    },
    (s: Scenario) => {
      s.nodes.hello.choices[0].next = "missing";
    },
    (s: Scenario) => {
      s.nodes.hello.choices[0].next = "hello";
    },
  ]) {
    const s = structuredClone(scenarios[0]);
    mutate(s);
    assert.throws(() => validateScenario(s));
  }
});

test("new library has unique ids, all required channels and genuine counterexamples", () => {
  assert.equal(new Set(scenarios.map((s) => s.id)).size, scenarios.length);
  for (const channel of ["call", "telegram", "whatsapp"]) {
    const group = scenarios.filter((s) => s.channel === channel);
    assert.ok(group.length >= 4);
    assert.ok(group.some((s) => s.reality === "legitimate"));
    assert.ok(group.some((s) => s.reality === "fraud"));
  }
});
test("previous payments remain acknowledged after a safe stop", () => {
  const s = scenarios.find((s) => s.id === "tg-tasks")!;
  const paid = advance(s, "start", "answer-2");
  assert.equal(paid.next, "detail");
  const stop = advance(s, paid.next, "answer-1");
  assert.equal(s.endings[stop.next].outcome, "caution");
  assert.match(s.endings[stop.next].message, /не вернулся/);
});

test("multi-channel identities follow explicit nodes rather than previous speakers", async () => {
  const { sceneIdentity, scenarioChannels } = await import("../src/engine");
  const s = scenarios.find((s) => s.id === "invoice-switch")!;
  assert.deepEqual(scenarioChannels(s), ["email", "whatsapp"]);
  assert.equal(sceneIdentity(s, "accountant").sender, "Новый бухгалтер");
  assert.equal(sceneIdentity(s, "accountant").channel, "whatsapp");
  assert.equal(sceneIdentity(s, "verify").sender, "Результат вашего действия");
  assert.equal(sceneIdentity(s, "paid").channel, "email");
});
test("each new story has multiple stages and multiple independent endings", async () => {
  const { batchThree } = await import("../src/content/batch-three");
  assert.equal(batchThree.length, 10);
  for (const s of batchThree) {
    assert.ok(Object.keys(s.nodes).length >= 3);
    assert.ok(Object.keys(s.endings).length >= 4);
  }
  const s = scenarios.find((s) => s.id === "refund-after-loss")!;
  assert.ok(Object.values(s.endings).every((e) => e.outcome !== "safe"));
});
