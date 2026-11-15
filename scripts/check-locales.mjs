import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import console from "node:console";
export function catalogProblems(source, target) {
  const issues = [];
  for (const kind of ["messages", "templates"])
    for (const key of Object.keys(source[kind])) {
      const value = target[kind]?.[key];
      if (typeof value !== "string" || !value.trim()) {
        issues.push({ kind, reason: "missing" });
        continue;
      }
      const tokens = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join(",");
      if (tokens(key) !== tokens(value))
        issues.push({ kind, reason: "placeholders" });
    }
  return issues;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const root = path.resolve(import.meta.dirname, "../src/i18n/catalogs");
  const source = JSON.parse(
    fs.readFileSync(path.join(root, "ru.json"), "utf8"),
  );
  let failed = false;
  for (const locale of ["en", "be"]) {
    const target = JSON.parse(
      fs.readFileSync(path.join(root, locale + ".json"), "utf8"),
    );
    const issues = catalogProblems(source, target);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
    );
    if (target.sourceHash !== manifest.sourceHash)
      issues.push({ kind: "metadata", reason: "source version" });
    console.log(
      locale +
        ": " +
        (issues.length
          ? issues.length + " incomplete or invalid entries"
          : "complete catalog"),
    );
    if (issues.length) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
}
