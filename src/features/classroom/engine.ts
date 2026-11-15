import { classroomLessons, type Lesson } from "../../content/classroom-lessons";
import { scenarios } from "../../content/scenarios";
import { skillIds, type SkillId } from "../../content/skills";
import { isObject, exactKeys, countsValid } from "../../platform/local-store";
import type { CompletionDetails, Outcome } from "../../collection-engine";
export type LessonRun = {
  revision: 1;
  lessonId: string;
  results: Record<string, CompletionDetails & { outcome: Outcome }>;
  answers: Record<string, string>;
};
export const newLessonRun = (lessonId: string): LessonRun => ({
  revision: 1,
  lessonId,
  results: {},
  answers: {},
});
export function lessonRunValid(v: unknown): v is LessonRun {
  if (
    !isObject(v) ||
    !exactKeys(v, ["revision", "lessonId", "results", "answers"]) ||
    v.revision !== 1 ||
    typeof v.lessonId !== "string" ||
    !isObject(v.results) ||
    !isObject(v.answers)
  )
    return false;
  const lesson = classroomLessons.find((l) => l.id === v.lessonId);
  if (!lesson) return false;
  return (
    Object.entries(v.answers).every(([id, o]) =>
      lesson.quiz.some(
        (q) => q.id === id && q.options.some((opt) => opt.id === o),
      ),
    ) &&
    Object.entries(v.results).every(
      ([id, r]) =>
        lesson.scenarioIds.includes(id) &&
        isObject(r) &&
        exactKeys(r, ["endingId", "counts", "outcome"]) &&
        typeof r.endingId === "string" &&
        ["safe", "caution", "risk"].includes(r.outcome as string) &&
        scenarios.find((s) => s.id === id)?.endings[r.endingId]?.outcome ===
          r.outcome &&
        countsValid(r.counts),
    )
  );
}
export function recordLessonResult(
  run: LessonRun,
  id: string,
  outcome: Outcome,
  details: CompletionDetails,
) {
  const next = {
    ...run,
    results: { ...run.results, [id]: { ...details, outcome } },
  };
  if (!lessonRunValid(next))
    throw Error("Результат не относится к этому занятию");
  return next;
}
export function answerLesson(run: LessonRun, id: string, option: string) {
  const next = { ...run, answers: { ...run.answers, [id]: option } };
  if (!lessonRunValid(next)) throw Error("Неверный ответ занятия");
  return next;
}
export type LessonReport = {
  schemaVersion: 1;
  kind: "lesson-summary";
  lessonId: string;
  lessonRevision: 1;
  status: "complete" | "incomplete";
  completedScenarios: number;
  answeredQuestions: number;
  points: number;
  maxPoints: number;
  skills: Partial<Record<SkillId, { points: number; maxPoints: number }>>;
};
export function lessonReport(lesson: Lesson, run: LessonRun): LessonReport {
  if (lesson.id !== run.lessonId || !lessonRunValid(run))
    throw Error("Неверный маршрут занятия");
  const skills: LessonReport["skills"] = {};
  let points = 0;
  for (const q of lesson.quiz) {
    const p = q.options.find((o) => o.id === run.answers[q.id])?.points ?? 0;
    points += p;
    const s = skills[q.skillId] ?? { points: 0, maxPoints: 0 };
    s.points += p;
    s.maxPoints += 2;
    skills[q.skillId] = s;
  }
  const answeredQuestions = Object.keys(run.answers).length,
    completedScenarios = Object.keys(run.results).length;
  return {
    schemaVersion: 1,
    kind: "lesson-summary",
    lessonId: lesson.id,
    lessonRevision: 1,
    status:
      answeredQuestions === lesson.quiz.length &&
      completedScenarios === lesson.scenarioIds.length
        ? "complete"
        : "incomplete",
    completedScenarios,
    answeredQuestions,
    points,
    maxPoints: 2 * lesson.quiz.length,
    skills,
  };
}
export function lessonReportValid(v: unknown): v is LessonReport {
  if (
    !isObject(v) ||
    !exactKeys(v, [
      "schemaVersion",
      "kind",
      "lessonId",
      "lessonRevision",
      "status",
      "completedScenarios",
      "answeredQuestions",
      "points",
      "maxPoints",
      "skills",
    ]) ||
    v.schemaVersion !== 1 ||
    v.kind !== "lesson-summary" ||
    v.lessonRevision !== 1 ||
    typeof v.lessonId !== "string" ||
    !isObject(v.skills)
  )
    return false;
  const lesson = classroomLessons.find((l) => l.id === v.lessonId);
  if (!lesson) return false;
  for (const [key, max] of [
    ["completedScenarios", lesson.scenarioIds.length],
    ["answeredQuestions", lesson.quiz.length],
    ["points", 2 * lesson.quiz.length],
  ] as const)
    if (
      !Number.isInteger(v[key]) ||
      (v[key] as number) < 0 ||
      (v[key] as number) > max
    )
      return false;
  const complete =
    v.completedScenarios === lesson.scenarioIds.length &&
    v.answeredQuestions === lesson.quiz.length;
  if (
    v.status !== (complete ? "complete" : "incomplete") ||
    v.maxPoints !== 2 * lesson.quiz.length ||
    (v.points as number) > 2 * (v.answeredQuestions as number)
  )
    return false;
  const expected = Object.fromEntries(
    [...new Set(lesson.quiz.map((q) => q.skillId))].map((id) => [
      id,
      2 * lesson.quiz.filter((q) => q.skillId === id).length,
    ]),
  );
  if (Object.keys(v.skills).length !== Object.keys(expected).length)
    return false;
  let sum = 0;
  for (const [id, s] of Object.entries(v.skills)) {
    if (
      !(id in expected) ||
      !skillIds.includes(id as SkillId) ||
      !isObject(s) ||
      !exactKeys(s, ["points", "maxPoints"]) ||
      s.maxPoints !== expected[id] ||
      !Number.isInteger(s.points) ||
      (s.points as number) < 0 ||
      (s.points as number) > (s.maxPoints as number)
    )
      return false;
    sum += s.points as number;
  }
  return sum === v.points;
}
export function parseLessonReport(text: string): LessonReport {
  if (new TextEncoder().encode(text).length > 65536)
    throw Error("Файл больше 64 КБ");
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw Error("Файл не является JSON");
  }
  if (!lessonReportValid(v))
    throw Error(
      "Нужна обезличенная сводка занятия правильной версии, без дополнительных полей",
    );
  return v;
}
export function aggregateReports(reports: LessonReport[]) {
  if (reports.some((r) => !lessonReportValid(r)))
    throw Error("Неверная сводка в группе");
  if (new Set(reports.map((r) => r.lessonId)).size > 1)
    throw Error("Выберите результаты одного занятия");
  const complete = reports.filter((r) => r.status === "complete");
  const scores = complete
    .map((r) => (100 * r.points) / r.maxPoints)
    .sort((a, b) => a - b);
  const n = scores.length;
  const mean = n ? scores.reduce((a, b) => a + b, 0) / n : null;
  const median = n
    ? n % 2
      ? scores[(n - 1) / 2]
      : (scores[n / 2 - 1] + scores[n / 2]) / 2
    : null;
  const skills: Partial<Record<SkillId, number>> = {};
  if (n >= 5) {
    for (const id of skillIds) {
      const values = complete.flatMap((r) =>
        r.skills[id]
          ? [(100 * r.skills[id]!.points) / r.skills[id]!.maxPoints]
          : [],
      );
      if (values.length >= 5)
        skills[id] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  return {
    n: reports.length,
    completed: n,
    incomplete: reports.length - n,
    mean,
    median,
    distribution: [
      scores.filter((s) => s < 50).length,
      scores.filter((s) => s >= 50 && s < 80).length,
      scores.filter((s) => s >= 80).length,
    ],
    skills: n >= 5 ? skills : null,
  };
}
export function groupCsv(reports: LessonReport[]) {
  const a = aggregateReports(reports);
  const rows: [string, string | number][] = [
    ["Сводок", a.n],
    ["Завершённых", a.completed],
    ["Незавершённых", a.incomplete],
    ["Среднее", a.mean ?? "нет данных"],
    ["Медиана", a.median ?? "нет данных"],
    ["Менее 50", a.distribution[0]],
    ["От 50 до 80", a.distribution[1]],
    ["80 и выше", a.distribution[2]],
  ];
  if (a.skills)
    for (const [id, s] of Object.entries(a.skills)) rows.push([id, s]);
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) =>
            typeof v === "number"
              ? String(v)
              : '"' + v.replaceAll('"', '""') + '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
export function lessonPublicUrl(id: string) {
  if (!classroomLessons.some((l) => l.id === id))
    throw Error("Неизвестное занятие");
  const u = new URL("https://denischunaev117.github.io/CyberShield/");
  u.searchParams.set("lesson", id);
  return u.href;
}
export function validateLessons() {
  if (classroomLessons.length < 3) throw Error("Нужны три занятия");
  for (const l of classroomLessons) {
    if (
      l.scenarioIds.length < 2 ||
      l.scenarioIds.length > 4 ||
      new Set(l.scenarioIds).size !== l.scenarioIds.length ||
      l.scenarioIds.some((id) => !scenarios.some((s) => s.id === id)) ||
      l.outcomes.length < 2 ||
      l.outcomes.length > 4 ||
      l.schedule.length !== 3 ||
      l.quiz.length < 3 ||
      l.quiz.some(
        (q) =>
          !skillIds.includes(q.skillId) ||
          q.options.length < 3 ||
          !q.options.some((o) => o.points === 2),
      )
    )
      throw Error(`Неполное занятие ${l.id}`);
  }
}
