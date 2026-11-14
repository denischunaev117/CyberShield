import type { LearningCollection } from "./content/collections";
import type { Scenario } from "./engine";
export type Outcome = "safe" | "caution" | "risk";
export type CompletionDetails = {
  endingId: string;
  counts: Record<Outcome, number>;
};
export type CollectionResult = CompletionDetails & {
  scenarioId: string;
  outcome: Outcome;
};
export type CollectionRun = {
  revision: number;
  startedAt: string;
  results: CollectionResult[];
  quiz: {
    status: "not-started" | "declined" | "in-progress" | "completed";
    answers: Record<string, string>;
  };
};
export const freshRun = (c: LearningCollection): CollectionRun => ({
  revision: c.revision,
  startedAt: new Date().toISOString(),
  results: [],
  quiz: { status: "not-started", answers: {} },
});
export function recordResult(
  c: LearningCollection,
  run: CollectionRun,
  result: CollectionResult,
): CollectionRun {
  const index = c.scenarioIds.indexOf(result.scenarioId);
  const replacing =
    index === run.results.length - 1 &&
    run.results.at(-1)?.scenarioId === result.scenarioId;
  if (index < 0 || (!replacing && index !== run.results.length))
    throw new Error("Результат не соответствует очереди подборки");
  return {
    ...run,
    results: replacing
      ? [...run.results.slice(0, -1), result]
      : [...run.results, result],
    quiz: { status: "not-started", answers: {} },
  };
}
export function answerQuiz(
  c: LearningCollection,
  run: CollectionRun,
  questionId: string,
  optionId: string,
): CollectionRun {
  if (
    run.results.length !== c.scenarioIds.length ||
    run.quiz.status !== "in-progress"
  )
    throw new Error("Квиз ещё не начат");
  const question = c.quiz.find((q) => !run.quiz.answers[q.id]);
  if (
    !question ||
    question.id !== questionId ||
    !question.options.some((o) => o.id === optionId)
  )
    throw new Error("Неверный шаг квиза");
  const answers = { ...run.quiz.answers, [questionId]: optionId };
  return {
    ...run,
    quiz: {
      status:
        Object.keys(answers).length === c.quiz.length
          ? "completed"
          : "in-progress",
      answers,
    },
  };
}
export function quizScore(c: LearningCollection, run: CollectionRun) {
  if (run.quiz.status !== "completed") return null;
  return {
    correct: c.quiz.filter((q) => run.quiz.answers[q.id] === q.correctId)
      .length,
    total: c.quiz.length,
  };
}
export function collectionReport(run: CollectionRun) {
  return {
    completed: run.results.length,
    riskyDecisions: run.results.reduce((n, r) => n + r.counts.risk, 0),
    cautiousOutcomes: run.results.filter((r) => r.outcome === "caution").length,
    riskyOutcomes: run.results.filter((r) => r.outcome === "risk").length,
  };
}
export function validateCollection(
  c: LearningCollection,
  scenarios: Scenario[],
) {
  if (
    c.scenarioIds.length < 3 ||
    new Set(c.scenarioIds).size !== c.scenarioIds.length
  )
    throw new Error("Неверный состав подборки");
  for (const id of c.scenarioIds)
    if (!scenarios.some((s) => s.id === id))
      throw new Error("Неизвестный сценарий");
  if (
    c.quiz.length < 3 ||
    new Set(c.quiz.map((q) => q.id)).size !== c.quiz.length
  )
    throw new Error("Неверный квиз");
  for (const q of c.quiz)
    if (
      q.options.length < 3 ||
      new Set(q.options.map((o) => o.id)).size !== q.options.length ||
      !q.options.some((o) => o.id === q.correctId)
    )
      throw new Error("Неверные варианты квиза");
}
