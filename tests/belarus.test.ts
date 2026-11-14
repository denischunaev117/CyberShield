import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { belarusBatch } from "../src/content/batch-belarus";
import { advance } from "../src/engine";
test("Belarus source ids refer to the separate document and retain authoring context", () => {
  const index = JSON.parse(
    readFileSync("docs/belarus-source-index.json", "utf8"),
  );
  assert.equal(index.items.length, 100);
  assert.equal(belarusBatch.length, 13);
  for (const s of belarusBatch) {
    assert.equal(s.source?.document, index.document);
    assert.ok(
      index.items.some((item: { id: number }) => item.id === s.source?.idea),
    );
    assert.ok(s.commonMistakes && s.commonMistakes.length >= 2);
  }
});
test("all evidence has usable labels and contains no actionable code, link or account number", () => {
  const panels = belarusBatch.flatMap((s) =>
    Object.values(s.nodes).flatMap((n) => (n.evidence ? [n.evidence] : [])),
  );
  assert.ok(panels.length >= 9);
  for (const p of panels) {
    assert.ok(p.title.length > 5);
    assert.ok(p.rows.length >= 3);
    assert.equal(new Set(p.rows.map((r) => r.label)).size, p.rows.length);
    for (const row of p.rows) {
      assert.ok(row.value.length > 0);
      assert.doesNotMatch(row.value, /https?:|\b\d{13,19}\b/);
      if (row.label === "Код") assert.match(row.value, /^•+$/);
    }
  }
});
test("stopping after disclosure, spending and signing does not erase previous consequences", () => {
  const cases = [
    ["rb-intercom", "after-code", "answer-3", "Код уже был раскрыт"],
    ["rb-real-flat-fake-owner", "paid", "answer-1", "Первый платёж"],
    ["rb-tour-booking", "verify", "answer-1", "ещё не возвращён"],
    ["rb-store-api", "shared", "answer-1", "изменения уже произошли"],
    ["rb-credit-phone", "signed", "answer-1", "Обязательство не исчезло"],
  ];
  for (const [id, node, choice, wording] of cases) {
    const s = belarusBatch.find((s) => s.id === id)!;
    const c = advance(s, node, choice);
    assert.equal(s.endings[c.next].outcome, "caution");
    assert.ok(s.endings[c.next].message.includes(wording));
  }
});
test("genuine role assignment offers different reasonable results", () => {
  const s = belarusBatch.find((s) => s.id === "rb-store-manager-real")!;
  assert.equal(s.reality, "legitimate");
  assert.ok(s.nodes.verify.choices.every((c) => c.assessment === "safe"));
  assert.equal(new Set(s.nodes.verify.choices.map((c) => c.next)).size, 3);
});
