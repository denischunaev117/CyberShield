import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { batchSeven } from "../src/content/batch-seven";
import { advance, validateScenario } from "../src/engine";
const source = JSON.parse(
  readFileSync("docs/belarus-source-index.json", "utf8"),
);
for (const s of batchSeven)
  test(`${s.id}: complete graph, explainable choices and distinct source`, () => {
    validateScenario(s);
    assert.ok(Object.keys(s.nodes).length >= 3);
    assert.ok(Object.keys(s.endings).length >= 3);
    assert.ok(s.commonMistakes && s.commonMistakes.length >= 2);
    assert.ok(
      source.items.some((item: { id: number }) => item.id === s.source?.idea),
    );
  });
test("viewing a credit application does not silently sign it, while stopping after signature preserves debt", () => {
  const s = batchSeven.find((s) => s.id === "call-mirror-credit")!;
  assert.equal(advance(s, "start", "answer-3").next, "application");
  assert.equal(advance(s, "application", "answer-1").next, "verify");
  assert.equal(
    s.endings[advance(s, "verify", "answer-1").next].outcome,
    "safe",
  );
  assert.equal(advance(s, "application", "answer-2").next, "signed");
  const stopped = s.endings[advance(s, "signed", "answer-1").next];
  assert.equal(stopped.outcome, "caution");
  assert.match(stopped.message, /договор|долг/);
});
test("meeting a courier does not silently hand over cash; only explicit transfer creates the loss", () => {
  const s = batchSeven.find((s) => s.id === "call-cash-inspection")!;
  assert.equal(advance(s, "start", "answer-3").next, "arrival");
  assert.match(s.nodes.arrival.message, /Пакет пока у вас/);
  assert.equal(
    s.endings[advance(s, "arrival", "answer-3").next].outcome,
    "safe",
  );
  assert.equal(advance(s, "arrival", "answer-2").next, "courier");
  const stopped = s.endings[advance(s, "courier", "answer-1").next];
  assert.equal(stopped.outcome, "caution");
  assert.match(stopped.message, /уже переданы/);
});
test("stopping after document exposure, screen sharing or publication retains the concrete consequence", () => {
  const examples = [
    ["medical-card-update", "document-sent", "answer-1", "Копия уже"],
    ["heating-compensation", "sent", "answer-1", "Копия уже"],
    ["crypto-help-screen", "shown", "answer-1", "Экран уже"],
    ["charity-consent-check", "published", "answer-1", "уже ушла"],
    ["crypto-mentor-access", "access", "answer-1", "операции уже"],
  ];
  for (const [id, node, choice, wording] of examples) {
    const s = batchSeven.find((s) => s.id === id)!;
    const ending = s.endings[advance(s, node, choice).next];
    assert.equal(ending.outcome, "caution");
    assert.ok(ending.message.includes(wording));
  }
});
test("genuine consultation has three reasonable decisions; verified borrower still has repayment risk", () => {
  const consultation = batchSeven.find(
    (s) => s.id === "call-tax-appointment-real",
  )!;
  assert.equal(consultation.reality, "legitimate");
  assert.ok(
    consultation.nodes.verify.choices.every((c) => c.assessment === "safe"),
  );
  assert.equal(
    new Set(consultation.nodes.verify.choices.map((c) => c.next)).size,
    3,
  );
  const friend = batchSeven.find((s) => s.id === "friend-business-real")!;
  assert.equal(friend.reality, "legitimate");
  assert.ok(friend.nodes.verify.choices.every((c) => c.assessment === "safe"));
  assert.match(friend.endings.considered.message, /не гарантирован/);
  assert.equal(friend.endings.unchecked.outcome, "caution");
});
