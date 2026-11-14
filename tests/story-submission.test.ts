import { test } from "node:test";
import assert from "node:assert/strict";
import { storyProblem } from "../src/story-submission";
const story =
  "В переписке знакомый просил срочно перевести деньги. Я проверил просьбу по сохранённому номеру и выяснил, что его аккаунт взломан. Переводить деньги не стал.";
test("a useful non-identifying narrative passes; short or excessive text does not", () => {
  assert.equal(storyProblem(story), null);
  assert.ok(storyProblem("Коротко"));
  assert.ok(storyProblem(story.repeat(50)));
});
test("common contact, credential and account details are caught before transmission", () => {
  for (const suffix of [
    " test@example.com",
    " +375 (29) 123-45-67",
    " 4111 1111 1111 1111",
    " AB1234567",
    " https://example.com",
    " @real_person",
    " код: 123456",
  ])
    assert.ok(storyProblem(story + suffix), suffix);
});
