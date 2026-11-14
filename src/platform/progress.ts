/** Replace this adapter when introducing native Android persistence. */
export type ProgressRecord = {
  id: string;
  outcome: "safe" | "caution" | "risk";
  completedAt: string;
};
export const progressStorageKey = "cybershield-progress-v1";
export const progressStore = {
  read(knownIds: ReadonlySet<string>): ProgressRecord[] {
    try {
      const data: unknown = JSON.parse(
        localStorage.getItem(progressStorageKey) || "[]",
      );
      return Array.isArray(data)
        ? data.filter(
            (x): x is ProgressRecord =>
              x !== null &&
              typeof x === "object" &&
              knownIds.has(x.id) &&
              ["safe", "caution", "risk"].includes(x.outcome) &&
              typeof x.completedAt === "string" &&
              Number.isFinite(Date.parse(x.completedAt)),
          )
        : [];
    } catch {
      return [];
    }
  },
  write(records: ProgressRecord[]): boolean {
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  },
};
