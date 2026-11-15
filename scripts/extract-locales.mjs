import { createHash } from "node:crypto";
import ts from "typescript";
import console from "node:console";
import fs from "node:fs";
import path from "node:path";
const messages = {},
  templates = {},
  locations = {};
const clean = (s) => s.replace(/\s+/g, " ").trim();
function add(text, kind, p, node, file) {
  const key = clean(text);
  if (!/[а-яёА-ЯЁ]/.test(key)) return;
  (kind === "template" ? templates : messages)[key] = key;
  (locations[key] ??= []).push(
    `${p}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`,
  );
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (p !== "src/i18n/catalogs") walk(p);
      continue;
    }
    if (
      !/\.tsx?$/.test(p) ||
      p.endsWith("source-materials.ts") ||
      p.endsWith("normalize.ts")
    )
      continue;
    const file = ts.createSourceFile(
      p,
      fs.readFileSync(p, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(n) {
      if (
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isJsxText(n)
      )
        add(n.text, "message", p, n, file);
      if (ts.isTemplateExpression(n)) {
        let text = n.head.text;
        n.templateSpans.forEach((part, i) => {
          text += `{${i}}` + part.literal.text;
        });
        add(text, "template", p, n, file);
      }
      ts.forEachChild(n, visit);
    }
    visit(file);
  }
}
walk("src");
// Initials and composed UI labels are not always complete literals in JSX.
// Keep their explicit source inventory without removing reviewed translations.
for (const text of JSON.parse(
  fs.readFileSync("src/i18n/dynamic-messages.json", "utf8"),
)) {
  const key = clean(text);
  messages[key] = key;
  (locations[key] ??= []).push("src/i18n/dynamic-messages.json");
}
fs.writeFileSync(
  "src/i18n/catalogs/ru.json",
  JSON.stringify(
    {
      messages: Object.fromEntries(Object.entries(messages).sort()),
      templates: Object.fromEntries(Object.entries(templates).sort()),
    },
    null,
    2,
  ) + "\n",
);
const canonical = JSON.parse(
  fs.readFileSync("src/i18n/catalogs/ru.json", "utf8"),
);
fs.writeFileSync(
  "src/i18n/catalogs/manifest.json",
  JSON.stringify(
    {
      sourceHash: createHash("sha256")
        .update(JSON.stringify(canonical))
        .digest("hex"),
      messages: Object.keys(messages).length,
      templates: Object.keys(templates).length,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  "/tmp/cybershield-locale-locations.json",
  JSON.stringify(locations, null, 2),
);
console.log(
  `Extracted ${Object.keys(messages).length} strings and ${Object.keys(templates).length} templates.`,
);
