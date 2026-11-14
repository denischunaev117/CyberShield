import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { scenarios } from "../src/content/scenarios";
const manifest = JSON.parse(readFileSync("public/audio/manifest.json", "utf8"));
for (const s of scenarios.filter((s) => s.channel === "call")) {
  test(`${s.id}: every spoken node has an intact ElevenLabs asset matching its current text`, () => {
    for (const n of Object.values(s.nodes)) {
      if (n.speaker === "narrator") {
        assert.equal(n.audio, undefined);
        continue;
      }
      assert.ok(n.audio);
      const file = n.audio.split("/").pop()!;
      const record = manifest[file];
      assert.equal(record.provider, "ElevenLabs");
      const bytes = readFileSync(`public${n.audio}`);
      assert.ok(bytes.length > 1000);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        record.sha256,
      );
      const payload = JSON.stringify({
        model: record.model,
        text: n.message,
        voice: record.voice_id,
      });
      // Python's canonical JSON uses spaces after separators and escapes non-ASCII.
      const canonical = payload
        .replace(/([^\\])"\s*:/g, '$1": ')
        .replace(/,"/g, ', "')
        .replace(
          /[\u007f-\uffff]/g,
          (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
        );
      assert.equal(
        createHash("sha256").update(canonical).digest("hex"),
        record.fingerprint,
      );
    }
  });
}
