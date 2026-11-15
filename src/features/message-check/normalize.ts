// Only a transient analysis view: never send or persist user text.
const lookalikes: Record<string, string> = {
  a: "а",
  c: "с",
  e: "е",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
  k: "к",
  m: "м",
  t: "т",
  b: "в",
  h: "н",
};
export function normalizeMessage(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(
      /[\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
      "",
    )
    .replace(/\u034f/g, "")
    .replace(/[a-zа-я]+/g, (word) =>
      /[а-я]/.test(word)
        ? word.replace(/[aceopxykmtbh]/g, (c) => lookalikes[c])
        : word,
    )
    .replace(/к[\s._*-]+о[\s._*-]+д/g, "код")
    .replace(/с[\s._*-]+м[\s._*-]+с/g, "смс")
    .replace(/п[\s._*-]+и[\s._*-]+н/g, "пин")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
export function matches(pattern: RegExp, text: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(text);
}
// Negation is attached to the request, not an entire message. A harmless
// sentence cannot disable detection of a dangerous request elsewhere.
export function affirmativeRequest(text: string, pattern: RegExp): boolean {
  const all = new RegExp(
    "(?<![a-zа-я0-9])(?:" + pattern.source + ")",
    pattern.flags.replace(/g/g, "") + "g",
  );
  for (const m of text.matchAll(all)) {
    const prefix = text.slice(Math.max(0, m.index! - 65), m.index);
    const tail = text.slice(m.index!, m.index! + m[0].length + 70);
    if (
      /кроме (?:наш|сотруд|оператор)|только (?:нам|нашему|сотруднику)/.test(
        tail,
      )
    )
      return true;
    if (
      /(?:\bне|не|нельзя|никогда не|не следует|не нужно|не надо|не стоит|не стоит никому|не рекомендуем)\s+(?:никому\s+)?$/.test(
        prefix,
      )
    )
      continue;
    if (/(?:никому|никогда)\s+не\s*$/.test(prefix)) continue;
    if (
      /(?:не (?:просим|будем|станем|будет|следует|надо|нужно)|нельзя|запрещено)\s+(?:вас\s+)?[а-я ]{0,20}$/.test(
        prefix,
      )
    )
      continue;
    return true;
  }
  return false;
}
