import { localStore, isObject, exactKeys } from "./local-store";
import { planValid, type Plan } from "../features/learning-plan/engine";
type PlanState = { revision: 1; plan: Plan | null };
export const learningPlanStore = localStore<PlanState>(
  "cybershield-learning-plan-v1",
  (v): v is PlanState =>
    isObject(v) &&
    exactKeys(v, ["revision", "plan"]) &&
    v.revision === 1 &&
    (v.plan === null || planValid(v.plan)),
  () => ({ revision: 1, plan: null }),
);
