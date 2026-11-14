import type { Choice, Ending, Scenario, Scene } from "../engine";
export type Option = [
  text: string,
  next: string,
  assessment: Choice["assessment"],
  explanation: string,
];
export function scene(
  message: string,
  options: [Option, Option, Option, ...Option[]],
  meta: Omit<Scene, "message" | "choices"> = {},
): Scene {
  return {
    ...meta,
    message,
    choices: options.map(([text, next, assessment, explanation], i) => ({
      id: `answer-${i + 1}`,
      text,
      next,
      assessment,
      explanation,
    })),
  };
}
export const ending = (
  title: string,
  message: string,
  outcome: Ending["outcome"],
): Ending => ({ title, message, outcome });
export function story(
  input: Omit<Scenario, "avatar" | "duration" | "difficulty" | "start">,
): Scenario {
  return {
    ...input,
    avatar: input.sender[0],
    duration: "5–7 минут",
    difficulty: "Средний",
    start: "start",
  };
}
