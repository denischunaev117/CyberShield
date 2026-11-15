import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import scripts from "../src/i18n/overrides/audio.json";
import { scenarios } from "../src/content/scenarios";
for (const locale of ["en", "be"] as const)
  test(`all 32 ${locale} clips match reviewed text, voice, model, and asset hash`, () => {
    const manifest = JSON.parse(
      fs.readFileSync(`public/audio/${locale}/manifest.json`, "utf8"),
    );
    assert.equal(Object.keys(manifest).length, 32);
    for (const scenario of scenarios)
      for (const [nodeId, node] of Object.entries(scenario.nodes)) {
        if (!node.audio) continue;
        const file = `${scenario.id}-${nodeId}.mp3`;
        const row = manifest[file],
          text = scripts[file as keyof typeof scripts][locale];
        assert.ok(text);
        assert.equal(scripts[file as keyof typeof scripts].ru, node.message);
        assert.equal(row.language, locale);
        assert.equal(row.model, "eleven_v4_turbo");
        assert.equal(row.provider, "ElevenLabs");
        const body: Record<string, string> = {
          language: locale,
          model: row.model,
          text,
          voice: row.voice_id,
        };
        const ascii = (value: string) =>
          JSON.stringify(value).replace(
            /[\u007f-\uffff]/g,
            (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
          );
        const canonical =
          "{" +
          Object.keys(body)
            .sort()
            .map((key) => ascii(key) + ": " + ascii(body[key]))
            .join(", ") +
          "}";
        const expected = createHash("sha256").update(canonical).digest("hex");
        assert.equal(row.fingerprint, expected);
        const data = fs.readFileSync(`public/audio/${locale}/${file}`);
        assert.ok(data.length > 1000);
        assert.equal(
          createHash("sha256").update(data).digest("hex"),
          row.sha256,
        );
      }
  });
test("OCR model files are local, compressed, and tied to known SHA-256 values", () => {
  const m = JSON.parse(fs.readFileSync("public/ocr/models.json", "utf8"));
  assert.deepEqual(
    m.models.map((x: { language: string }) => x.language),
    ["eng", "rus", "bel"],
  );
  for (const row of m.models) {
    const compressed = fs.readFileSync(
      `public/ocr/lang/${row.language}.traineddata.gz`,
    );
    assert.equal(
      createHash("sha256").update(compressed).digest("hex"),
      row.compressedSha256,
    );
    const raw = gunzipSync(compressed);
    assert.equal(raw.length, row.bytes);
    assert.equal(createHash("sha256").update(raw).digest("hex"), row.sha256);
  }
});
