import { test } from "node:test";
import assert from "node:assert/strict";
import { scenarios } from "../src/content/scenarios";
import { skills } from "../src/content/skills";
import {
  scenarioSkills,
  validateScenarioSkills,
} from "../src/content/scenario-skills";
import { references, validateReferences } from "../src/content/references";
import {
  incidentRoots,
  incidentNodes,
  incidentGuides,
} from "../src/content/emergency-flows";
import { validateFlows } from "../src/features/emergency/engine";
import { riskRules } from "../src/features/message-check/rules";
import { analyzeMessage } from "../src/features/message-check/analyze";
import {
  contentReviews,
  validateContentReviews,
} from "../src/content/content-reviews";
test("the review registry does not invent experts for training content", () => {
  validateContentReviews();
  assert.equal(
    contentReviews.filter((r) => r.contentId.startsWith("scenario:")).length,
    100,
  );
  assert.ok(contentReviews.every((r) => r.status === "draft"));
  const forged = structuredClone(contentReviews);
  forged[0].status = "expert-reviewed";
  assert.throws(() => validateContentReviews(forged));
});
test("stable skills cover all 100 existing stories without changing their content", () => {
  validateScenarioSkills();
  assert.equal(Object.keys(scenarioSkills).length, 100);
  assert.ok(skills.length >= 10);
});
test("source dates and links are valid; inaccessible sources never claim verified review", () => {
  validateReferences();
  assert.ok(references.length >= 10);
  for (const r of references.filter((r) => r.status === "pending"))
    assert.equal(r.checkedAt, undefined);
});
const validate = (nodes = incidentNodes, guides = incidentGuides) =>
  validateFlows(
    incidentRoots,
    nodes,
    guides,
    new Set(scenarios.map((s) => s.id)),
    new Set(references.map((r) => r.id)),
  );
test("all seven help branches reach a valid guide, have uncertainty paths and real related stories", () => {
  validate();
  assert.equal(Object.keys(incidentRoots).length, 7);
});
test("help rejects loops, missing guides and invented source references", () => {
  const nodes = structuredClone(incidentNodes);
  nodes["contact-q"].answers[0].next = "contact-q";
  assert.throws(() => validate(nodes));
  const missing = structuredClone(incidentNodes);
  missing["contact-q"].answers[0].next = "nothing";
  assert.throws(() => validate(missing));
  const guides = structuredClone(incidentGuides);
  guides.contact.sourceIds = ["invented"];
  assert.throws(() => validate(incidentNodes, guides));
});
test("money already sent and mere page opening have distinct, non-reassuring guidance", () => {
  assert.match(incidentGuides["money-sent"].intro, /не возвращает/);
  assert.match(incidentGuides["site-opened"].intro, /не доказывает заражение/);
  assert.ok(
    incidentGuides["bank-access"].stepsNow.some((t) => /Немедленно/.test(t)),
  );
});
for (const r of riskRules)
  test(`rule ${r.id}: documented trigger, skill and sources`, () => {
    assert.ok(r.examples.some((e) => r.test(e)));
    assert.ok(skills.some((s) => s.id === r.skillId));
    assert.ok(r.sourceIds.every((id) => references.some((s) => s.id === id)));
    assert.ok(r.reason && r.advice && r.version === 1);
  });
test("analysis is deterministic and only returns rule IDs, not the submitted text", () => {
  const text =
    "Срочно, служба безопасности банка! Продиктуйте код из SMS и переведите деньги на безопасный счёт. Никому не говорите.";
  const a = analyzeMessage(text);
  assert.deepEqual(a, analyzeMessage(text));
  assert.equal(a.level, "high");
  assert.ok(a.ruleIds.length >= 5);
  assert.ok(!JSON.stringify(a).includes(text));
});
test("own-operation code advice is not a request to disclose a code", () => {
  const a = analyzeMessage(
    "Для своей операции откройте официальное приложение. Никому не сообщайте код из SMS.",
  );
  assert.ok(!a.ruleIds.includes("secret-request"));
  const b = analyzeMessage("Не сообщайте код никому, кроме нашего сотрудника.");
  assert.ok(b.ruleIds.includes("secret-request"));
});
test("neutral text is not called safe and malformed or sensitive input is rejected", () => {
  assert.equal(
    analyzeMessage("Встречаемся завтра у входа в библиотеку.").level,
    "none",
  );
  for (const text of [
    "",
    "x".repeat(3001),
    "Позвоните +375 (29) 123-45-67",
    "Пишите test@example.com",
    "Код: 123456",
    "https://example.invalid/?token=secret",
  ])
    assert.throws(() => analyzeMessage(text));
  assert.ok(
    analyzeMessage('<script>alert("hello")</script>').ruleIds.length === 0,
  );
});
