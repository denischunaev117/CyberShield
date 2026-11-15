import { localStore, isObject, exactKeys } from "./local-store";
import {
  diagnosticValid,
  type DiagnosticRun,
} from "../features/diagnostics/engine";
export type DiagnosticState = { revision: 1; run: DiagnosticRun | null };
export const diagnosticsStore = localStore<DiagnosticState>(
  "cybershield-diagnostics-v1",
  (v): v is DiagnosticState =>
    isObject(v) &&
    exactKeys(v, ["revision", "run"]) &&
    v.revision === 1 &&
    (v.run === null || diagnosticValid(v.run)),
  () => ({ revision: 1, run: null }),
);
