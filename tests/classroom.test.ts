import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { classroomLessons } from "../src/content/classroom-lessons";
import { scenarios } from "../src/content/scenarios";
import {
  newLessonRun,
  recordLessonResult,
  answerLesson,
  lessonReport,
  lessonReportValid,
  parseLessonReport,
  aggregateReports,
  groupCsv,
  lessonPublicUrl,
  validateLessons,
} from "../src/features/classroom/engine";
function sample(complete = true) {
  const l = classroomLessons[0];
  let r = newLessonRun(l.id);
  if (complete)
    for (const id of l.scenarioIds) {
      const s = scenarios.find((s) => s.id === id)!;
      let node = s.start;
      const counts = { safe: 0, caution: 0, risk: 0 };
      while (!s.endings[node]) {
        const c = s.nodes[node].choices[0];
        counts[c.assessment]++;
        node = c.next;
      }
      r = recordLessonResult(r, id, s.endings[node].outcome, {
        endingId: node,
        counts,
      });
    }
  for (const q of l.quiz)
    r = answerLesson(r, q.id, q.options.find((o) => o.points === 2)!.id);
  return lessonReport(l, r);
}
test("three complete methodological lessons use existing stories and independent quizzes", () => {
  validateLessons();
  assert.equal(classroomLessons.length, 3);
});
for (const lesson of classroomLessons)
  test(`${lesson.id}: QR actually decodes to a public lesson URL without identifiers`, () => {
    const url = lessonPublicUrl(lesson.id);
    const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
    const size = qr.modules.size,
      scale = 5,
      border = 4,
      width = (size + border * 2) * scale;
    const pixels = new Uint8ClampedArray(width * width * 4);
    for (let y = 0; y < width; y++)
      for (let x = 0; x < width; x++) {
        const qx = Math.floor(x / scale) - border,
          qy = Math.floor(y / scale) - border;
        const dark =
          qx >= 0 &&
          qy >= 0 &&
          qx < size &&
          qy < size &&
          qr.modules.data[qy * size + qx];
        const index = (y * width + x) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = dark ? 17 : 255;
        pixels[index + 3] = 255;
      }
    assert.equal(jsQR(pixels, width, width)?.data, url);
    const u = new URL(url);
    assert.equal(u.pathname, "/CyberShield/");
    assert.deepEqual([...u.searchParams.keys()], ["lesson"]);
  });
test("reports contain aggregates only and a partial lesson remains incomplete", () => {
  const a = sample();
  assert.ok(lessonReportValid(a));
  assert.equal(a.status, "complete");
  assert.equal(sample(false).status, "incomplete");
  const text = JSON.stringify(a);
  for (const key of [
    "name",
    "email",
    "runId",
    "deviceId",
    "answers",
    "endingId",
  ])
    assert.ok(!text.includes(key));
  assert.deepEqual(parseLessonReport(text), a);
});
test("strict imports reject personal/unknown fields, invalid skills, zero denominators, old versions and oversized JSON", () => {
  const a = sample();
  for (const v of [
    { ...a, name: "fiction" },
    { ...a, schemaVersion: 2 },
    { ...a, maxPoints: 0 },
    { ...a, lessonId: "missing" },
    { ...a, status: "incomplete" },
    { ...a, skills: { identity: { points: 6 } } },
  ])
    assert.throws(() => parseLessonReport(JSON.stringify(v)));
  assert.throws(() => parseLessonReport("{"));
  assert.throws(() => parseLessonReport(" ".repeat(65537)));
});
test("N, mean, median and incomplete counts are correct; small groups never export skills", () => {
  const a = sample();
  const incomplete = sample(false);
  const low = {
    ...a,
    points: 0,
    skills: Object.fromEntries(
      Object.entries(a.skills).map(([id, v]) => [id, { ...v, points: 0 }]),
    ),
  };
  assert.ok(lessonReportValid(low));
  const stats = aggregateReports([a, low, incomplete]);
  assert.equal(stats.n, 3);
  assert.equal(stats.completed, 2);
  assert.equal(stats.incomplete, 1);
  assert.equal(stats.mean, 50);
  assert.equal(stats.median, 50);
  assert.equal(stats.skills, null);
  assert.ok(!groupCsv([a]).includes("identity"));
  assert.ok(
    aggregateReports(Array.from({ length: 5 }, () => a)).skills?.identity !==
      undefined,
  );
});
