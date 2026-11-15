import { localStore, isObject, exactKeys } from "./local-store";
import { lessonRunValid, type LessonRun } from "../features/classroom/engine";
type ClassroomState = { revision: 1; runs: Record<string, LessonRun> };
export const classroomStore = localStore<ClassroomState>(
  "cybershield-classroom-v1",
  (v): v is ClassroomState =>
    isObject(v) &&
    exactKeys(v, ["revision", "runs"]) &&
    v.revision === 1 &&
    isObject(v.runs) &&
    Object.entries(v.runs).every(
      ([id, r]) => lessonRunValid(r) && r.lessonId === id,
    ),
  () => ({ revision: 1, runs: {} }),
);
