import {
  diagnosticQuestions,
  type DiagnosticQuestion,
} from "../../content/diagnostic-questions";
import { skillIds, type SkillId } from "../../content/skills";
import { exactKeys, isObject } from "../../platform/local-store";
export type Answers = Record<string, string>;
export type FollowUp = {
  form: "A" | "B";
  answers: Answers;
  cursor: number;
  complete: boolean;
};
export type DiagnosticRun = {
  revision: 1;
  runId: string;
  seed: number;
  order: "A-B" | "B-A";
  startedAt: string;
  pre: Answers;
  post: Answers;
  stage: "pre" | "practice" | "post" | "complete";
  cursor: number;
  followUp?: FollowUp;
};
export const formQuestions = (form: "A" | "B") =>
  diagnosticQuestions.filter((q) => q.form === form);
export const initialForm = (r: DiagnosticRun): "A" | "B" =>
  r.order === "A-B" ? "A" : "B";
export const finalForm = (r: DiagnosticRun): "A" | "B" =>
  initialForm(r) === "A" ? "B" : "A";
export function newDiagnostic(
  seed: number,
  runId: string,
  startedAt = new Date().toISOString(),
): DiagnosticRun {
  return {
    revision: 1,
    runId,
    seed,
    order: seed % 2 === 0 ? "A-B" : "B-A",
    startedAt,
    pre: {},
    post: {},
    stage: "pre",
    cursor: 0,
  };
}
export function answersValid(
  answers: unknown,
  form: "A" | "B",
): answers is Answers {
  return (
    isObject(answers) &&
    Object.entries(answers).every(
      ([id, option]) =>
        typeof option === "string" &&
        formQuestions(form).some(
          (q) => q.id === id && q.options.some((o) => o.id === option),
        ),
    )
  );
}
export function diagnosticValid(value: unknown): value is DiagnosticRun {
  if (
    !isObject(value) ||
    !exactKeys(value, [
      "revision",
      "runId",
      "seed",
      "order",
      "startedAt",
      "pre",
      "post",
      "stage",
      "cursor",
      "followUp",
    ]) ||
    value.revision !== 1 ||
    typeof value.runId !== "string" ||
    !/^[a-f\d-]{8,64}$/i.test(value.runId) ||
    value.runId.length > 64 ||
    !Number.isSafeInteger(value.seed) ||
    !Number.isInteger(value.cursor) ||
    (value.cursor as number) < 0 ||
    (value.cursor as number) >= 12 ||
    typeof value.startedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.startedAt) ||
    !Number.isFinite(Date.parse(value.startedAt)) ||
    !["A-B", "B-A"].includes(value.order as string) ||
    !["pre", "practice", "post", "complete"].includes(value.stage as string)
  )
    return false;
  const r = value as unknown as DiagnosticRun;
  if (
    !answersValid(r.pre, initialForm(r)) ||
    !answersValid(r.post, finalForm(r))
  )
    return false;
  const pre = Object.keys(r.pre).length,
    post = Object.keys(r.post).length;
  if (r.stage === "pre" && (pre === 12 || post > 0)) return false;
  if (r.stage !== "pre" && pre !== 12) return false;
  if (r.stage === "practice" && post > 0) return false;
  if (r.stage === "post" && post === 12) return false;
  if (r.stage === "complete" && post !== 12) return false;
  if (r.followUp !== undefined) {
    const f = r.followUp;
    if (
      r.stage !== "complete" ||
      !isObject(f) ||
      !exactKeys(f, ["form", "answers", "cursor", "complete"]) ||
      !["A", "B"].includes(f.form) ||
      !answersValid(f.answers, f.form) ||
      !Number.isInteger(f.cursor) ||
      f.cursor < 0 ||
      f.cursor >= 12 ||
      typeof f.complete !== "boolean" ||
      f.complete !== (Object.keys(f.answers).length === 12)
    )
      return false;
  }
  return true;
}
export function answerDiagnostic(
  r: DiagnosticRun,
  id: string,
  option: string,
): DiagnosticRun {
  if (r.stage !== "pre" && r.stage !== "post")
    throw Error("Сейчас нет активного теста");
  const form = r.stage === "pre" ? initialForm(r) : finalForm(r);
  const q = formQuestions(form).find((q) => q.id === id);
  if (!q?.options.some((o) => o.id === option))
    throw Error("Недопустимый ответ");
  const answers = { ...r[r.stage], [id]: option };
  const complete = Object.keys(answers).length === 12;
  return {
    ...r,
    [r.stage]: answers,
    stage: complete ? (r.stage === "pre" ? "practice" : "complete") : r.stage,
    cursor: complete ? 0 : (r.cursor + 1) % 12,
  };
}
export function startPost(r: DiagnosticRun): DiagnosticRun {
  if (r.stage !== "practice") throw Error("Сначала завершите входной тест");
  return { ...r, stage: "post", cursor: 0 };
}
export function answerFollowUp(
  r: DiagnosticRun,
  id: string,
  option: string,
): DiagnosticRun {
  const f = r.followUp;
  if (r.stage !== "complete" || !f || f.complete)
    throw Error("Нет повторной проверки");
  if (
    !formQuestions(f.form)
      .find((q) => q.id === id)
      ?.options.some((o) => o.id === option)
  )
    throw Error("Недопустимый ответ");
  const answers = { ...f.answers, [id]: option };
  return {
    ...r,
    followUp: {
      ...f,
      answers,
      cursor: (f.cursor + 1) % 12,
      complete: Object.keys(answers).length === 12,
    },
  };
}
export function scoreForm(form: "A" | "B", answers: Answers) {
  if (!answersValid(answers, form)) throw Error("Неверные ответы формы");
  const questions = formQuestions(form);
  if (Object.keys(answers).length !== questions.length) return null;
  const totals: Partial<
    Record<SkillId, { points: number; maxPoints: number }>
  > = {};
  let points = 0;
  for (const q of questions) {
    const p = q.options.find((o) => o.id === answers[q.id])!.points;
    points += p;
    const t = totals[q.skillId] ?? { points: 0, maxPoints: 0 };
    t.points += p;
    t.maxPoints += 2;
    totals[q.skillId] = t;
  }
  return {
    score: (100 * points) / (2 * questions.length),
    points,
    maxPoints: 2 * questions.length,
    skills: Object.fromEntries(
      Object.entries(totals).map(([id, v]) => [
        id,
        { ...v, score: (100 * v!.points) / v!.maxPoints },
      ]),
    ) as Record<SkillId, { points: number; maxPoints: number; score: number }>,
  };
}
export function diagnosticSummary(r: DiagnosticRun) {
  const pre = scoreForm(initialForm(r), r.pre),
    post = scoreForm(finalForm(r), r.post);
  return { pre, post, changePp: pre && post ? post.score - pre.score : null };
}
export function diagnosticExport(r: DiagnosticRun) {
  const s = diagnosticSummary(r);
  return {
    schemaVersion: 1,
    kind: "diagnostic-summary",
    testRevision: r.revision,
    status: r.stage === "complete" ? "complete" : "incomplete",
    answeredPre: Object.keys(r.pre).length,
    answeredPost: Object.keys(r.post).length,
    preScore: s.pre?.score ?? null,
    postScore: s.post?.score ?? null,
    changePp: s.changePp,
    skills: Object.fromEntries(
      skillIds.map((id) => [
        id,
        {
          pre: s.pre?.skills[id]?.score ?? null,
          post: s.post?.skills[id]?.score ?? null,
        },
      ]),
    ),
  };
}
export function validateDiagnosticQuestions(
  questions: DiagnosticQuestion[] = diagnosticQuestions,
) {
  if (!skillIds.every((id) => questions.some((q) => q.skillId === id)))
    throw Error("В диагностике должны быть представлены все навыки");
  if (
    questions.length < 24 ||
    new Set(questions.map((q) => q.id)).size !== questions.length
  )
    throw Error("Нужны 24 уникальных задания");
  if (
    ["A", "B"].some((f) => questions.filter((q) => q.form === f).length !== 12)
  )
    throw Error("Нужны две формы по 12");
  for (const q of questions) {
    const pair = questions.filter((p) => p.pairId === q.pairId);
    if (
      pair.length !== 2 ||
      pair[0].form === pair[1].form ||
      pair[0].prompt === pair[1].prompt ||
      pair.some(
        (p) => p.skillId !== q.skillId || p.difficulty !== q.difficulty,
      ) ||
      !skillIds.includes(q.skillId) ||
      q.options.length < 3 ||
      new Set(q.options.map((o) => o.id)).size !== q.options.length ||
      !q.options.some((o) => o.points === 2) ||
      q.options.some((o) => ![0, 1, 2].includes(o.points) || !o.explanation)
    )
      throw Error(`Неверная пара ${q.id}`);
  }
}
