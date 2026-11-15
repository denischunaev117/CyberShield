import { test } from "node:test";
import assert from "node:assert/strict";
import { suspiciousMessages, neutralMessages } from "./fixtures/message-corpus";
import {
  analyzeMessage,
  sensitiveMessageProblem,
} from "../src/features/message-check/analyze";
import { riskRules, ruleExcerpt } from "../src/features/message-check/rules";
import { references, validateReferences } from "../src/content/references";
import { sourceArchive } from "../src/content/source-materials";
for (const [i, sample] of suspiciousMessages.entries())
  test(`supplied-source regression ${i + 1}: ${sample.source}`, () => {
    const result = analyzeMessage(sample.text);
    assert.notEqual(result.level, "none", sample.text);
    for (const id of sample.expected)
      assert.ok(
        result.ruleIds.includes(id),
        `${sample.text}: missing ${id}; got ${result.ruleIds}`,
      );
  });
for (const [i, text] of neutralMessages.entries())
  test(`ordinary text and protective advice ${i + 1}`, () => {
    const result = analyzeMessage(text);
    assert.equal(result.level, "none", `${text}: ${result.ruleIds}`);
  });
test("every documented rule example is recognized, not just its first example", () => {
  for (const r of riskRules)
    for (const text of r.examples) assert.ok(r.test(text), `${r.id}: ${text}`);
});
test("indirect warnings stay contextual; dangerous combinations escalate", () => {
  assert.equal(
    analyzeMessage("Привет, выручишь до завтра?").level,
    "attention",
  );
  const result = analyzeMessage("Срочно, выручишь до завтра? Не звони.");
  assert.equal(result.level, "high");
  assert.ok(result.combinationIds.includes("pressure-and-money"));
  assert.equal(
    analyzeMessage("Пройдите опрос за вознаграждение на bonus.invalid").level,
    "high",
  );
});
test("evidence uses the matching part and never interprets HTML", () => {
  const text = "Добрый день! Как вы? Скинь код из смс.";
  const r = riskRules.find((r) => r.id === "secret-request")!;
  assert.equal(ruleExcerpt(text, r), "Скинь код из смс.");
  const out = JSON.stringify(
    analyzeMessage(
      '<img src="https://example.invalid/x" onerror="alert(1)"> Скинь код из смс.',
    ),
  );
  assert.ok(!out.includes("img"));
  assert.ok(!out.includes("onerror"));
});
test("normalization does not bypass private-code validation", () => {
  for (const text of [
    "Кoд: １２３４５６",
    "к\u200bод: 123456",
    "https://example.invalid/?TOKEN=private",
  ])
    assert.ok(sensitiveMessageProblem(text));
});
test("the public registry only contains supplied organizations and existing W3C materials", () => {
  validateReferences();
  assert.equal(references.length, 15);
  assert.ok(
    !references.some((r) => ["belpost", "epasluga", "nces"].includes(r.id)),
  );
  assert.equal(
    new Set(sourceArchive.materials.map((m) => m.referenceId)).size,
    9,
  );
  for (const m of sourceArchive.materials)
    assert.match(m.sha256, /^[a-f0-9]{64}$/);
  for (const r of references.filter((r) => r.status === "provided"))
    assert.ok(r.materialIds?.length);
});
test("bounded input remains deterministic on long and punctuation-heavy messages", () => {
  const start = performance.now();
  for (const t of ["а".repeat(3000), "Не ".repeat(990), "код. ".repeat(550)]) {
    const a = analyzeMessage(t);
    assert.deepEqual(a, analyzeMessage(t));
    assert.equal(a.revision, 2);
  }
  assert.ok(performance.now() - start < 3000);
});
