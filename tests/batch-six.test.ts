import { test } from "node:test";
import assert from "node:assert/strict";
import { batchSix } from "../src/content/batch-six";
import { advance, validateScenario } from "../src/engine";
import { readFileSync } from "node:fs";
const source = JSON.parse(
  readFileSync("docs/belarus-source-index.json", "utf8"),
);
for (const scenario of batchSix)
  test(`${scenario.id}: authored stages, endings, source and mistakes`, () => {
    validateScenario(scenario);
    assert.ok(Object.keys(scenario.nodes).length >= 3);
    assert.ok(Object.keys(scenario.endings).length >= 4);
    assert.ok(scenario.commonMistakes && scenario.commonMistakes.length >= 2);
    assert.ok(
      source.items.some(
        (item: { id: number }) => item.id === scenario.source?.idea,
      ),
    );
  });
test("partial real payment is not treated as full settlement; stopping after handover keeps the consequence", () => {
  const s = batchSix.find((s) => s.id === "car-payment-proof")!;
  assert.match(
    s.nodes.explanation.evidence!.rows.find(
      (r) => r.label === "Поступило в вашем банке",
    )!.value,
    /8 000/,
  );
  assert.equal(advance(s, "bank", "answer-3").next, "handed");
  const last = advance(s, "handed", "answer-1");
  assert.equal(s.endings[last.next].outcome, "caution");
  assert.match(s.endings[last.next].message, /Автомобиль уже передан/);
});
test("receiving keys does not authorize a rental car sale", () => {
  const s = batchSix.find((s) => s.id === "rented-car-sale")!;
  assert.equal(advance(s, "start", "answer-1").next, "documents");
  assert.equal(advance(s, "documents", "answer-1").next, "verify");
  assert.match(s.nodes.verify.message, /в аренду/);
});
test("retracting a forwarded survey is acknowledged as damage limitation", () => {
  const s = batchSix.find((s) => s.id === "survey-forwarding")!;
  assert.equal(advance(s, "start", "answer-3").next, "forwarded");
  const end = advance(s, "forwarded", "answer-1");
  assert.equal(s.endings[end.next].outcome, "caution");
  assert.match(s.endings[end.next].message, /уже ушло знакомым/);
});
test("verified real service permits three distinct safe decisions and paid medical purchase is not erased", () => {
  const real = batchSix.find((s) => s.id === "call-home-service-real")!;
  assert.equal(real.reality, "legitimate");
  assert.ok(real.nodes.verify.choices.every((c) => c.assessment === "safe"));
  assert.equal(new Set(real.nodes.verify.choices.map((c) => c.next)).size, 3);
  const medicine = batchSix.find((s) => s.id === "call-wonder-cure")!;
  const c = advance(medicine, "paid", "answer-1");
  assert.equal(medicine.endings[c.next].outcome, "caution");
  assert.match(medicine.endings[c.next].message, /не вернулась автоматически/);
});
