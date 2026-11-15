/** A bounded versioned store with an in-tab fallback. Never stores free text. */
export function localStore<T>(
  key: string,
  valid: (value: unknown) => value is T,
  empty: () => T,
) {
  let memory: T | undefined;
  let volatile = false;
  return {
    isVolatile() {
      return volatile;
    },
    read(): T {
      if (volatile && memory !== undefined) return memory;
      try {
        const raw = localStorage.getItem(key);
        const value: unknown = raw ? JSON.parse(raw) : null;
        memory = valid(value) ? value : empty();
        return memory;
      } catch {
        return memory ?? empty();
      }
    },
    write(value: T): boolean {
      if (!valid(value)) throw new Error("Недопустимые данные для сохранения");
      memory = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
        volatile = false;
        return true;
      } catch {
        volatile = true;
        return false;
      }
    },
    clear(): boolean {
      memory = empty();
      try {
        localStorage.removeItem(key);
        volatile = false;
        return true;
      } catch {
        volatile = true;
        return false;
      }
    },
  };
}
export const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const exactKeys = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
export function countsValid(
  v: unknown,
): v is { safe: number; caution: number; risk: number } {
  if (!isObject(v) || !exactKeys(v, ["safe", "caution", "risk"])) return false;
  const a = [v.safe, v.caution, v.risk];
  return (
    a.every(
      (x) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < 10,
    ) &&
    a.reduce<number>((n, x) => n + (x as number), 0) > 0 &&
    a.reduce<number>((n, x) => n + (x as number), 0) < 10
  );
}
