export type Preferences = { theme: "light" | "dark"; lowVision: boolean };
export const preferencesKey = "cybershield-preferences-v1";
export function readPreferences(): Preferences {
  try {
    const data = JSON.parse(localStorage.getItem(preferencesKey) || "null");
    return {
      theme: data?.theme === "dark" ? "dark" : "light",
      lowVision: data?.lowVision === true,
    };
  } catch {
    return { theme: "light", lowVision: false };
  }
}
export function applyPreferences(p: Preferences) {
  document.documentElement.dataset.theme = p.theme;
  document.documentElement.dataset.lowVision = String(p.lowVision);
}
export function savePreferences(p: Preferences): boolean {
  try {
    localStorage.setItem(preferencesKey, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
