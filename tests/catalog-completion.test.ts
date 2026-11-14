import { test } from "node:test";
import assert from "node:assert/strict";
import { scenarios } from "../src/content/scenarios";
import { batchEight } from "../src/content/batch-eight";
import { batchNine } from "../src/content/batch-nine";
import { collections } from "../src/content/collections";
import { advance } from "../src/engine";

test("completed library contains 100 distinct stories, including genuine encounters", () => {
  assert.equal(scenarios.length, 100);
  assert.equal(batchEight.length + batchNine.length, 28);
  assert.equal(new Set(scenarios.map((s) => s.id)).size, 100);
  assert.equal(scenarios.filter((s) => s.reality === "legitimate").length, 19);
  for (const s of [...batchEight, ...batchNine]) {
    assert.ok(s.source?.idea);
    assert.ok(s.lessons.length >= 2);
    assert.ok(s.commonMistakes && s.commonMistakes.length >= 2);
    assert.ok(Object.keys(s.nodes).length >= 2);
    assert.ok(Object.keys(s.endings).length >= 2);
  }
});
test("preparing a property transaction or meeting a courier does not silently transfer assets", () => {
  const property = batchEight.find((s) => s.id === "call-protect-property")!;
  assert.equal(advance(property, "start", "answer-3").next, "prepared");
  assert.equal(advance(property, "prepared", "answer-1").next, "check");
  assert.equal(
    property.endings[advance(property, "check", "answer-1").next].outcome,
    "safe",
  );
  assert.equal(
    property.endings[advance(property, "prepared", "answer-2").next].outcome,
    "risk",
  );
  const courier = batchNine.find((s) => s.id === "epasluga-money-courier")!;
  assert.equal(advance(courier, "start", "answer-3").next, "accepted");
  assert.equal(
    courier.endings[advance(courier, "accepted", "answer-1").next].outcome,
    "safe",
  );
  assert.equal(
    courier.endings[advance(courier, "accepted", "answer-2").next].outcome,
    "risk",
  );
});
test("a safe decision after an existing payment cannot erase that payment", () => {
  for (const id of ["refund-form-after-order", "fake-crypto-exchange"]) {
    const s = batchEight.find((s) => s.id === id)!;
    assert.ok(Object.values(s.endings).every((e) => e.outcome !== "safe"));
  }
  for (const id of [
    "call-secret-operation",
    "call-import-compensation",
    "car-import-advance",
    "telegram-car-rental",
    "blogger-prize-delivery",
  ]) {
    const s = scenarios.find((s) => s.id === id)!;
    const transferred = s.nodes.transferred ? "transferred" : "paid";
    assert.equal(
      s.endings[advance(s, transferred, "answer-1").next].outcome,
      "caution",
    );
  }
});
test("new collection combines ten stories and a separate optional quiz with explanations", () => {
  const c = collections.find((c) => c.id === "benefits-and-obligations")!;
  assert.equal(c.scenarioIds.length, 10);
  assert.ok(
    c.scenarioIds.some(
      (id) => scenarios.find((s) => s.id === id)?.reality === "legitimate",
    ),
  );
  assert.equal(c.quiz.length, 3);
  assert.equal(new Set(c.quiz.map((q) => q.correctId)).size, 3);
});
