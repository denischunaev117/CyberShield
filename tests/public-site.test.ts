import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
// @ts-expect-error Node-only deployment helper has no TypeScript declarations.
import { verifyPublicSite } from "../scripts/verify-public-site.mjs";

for (const mode of [
  "valid",
  "missing-audio",
  "corrupt-audio",
  "missing-localized",
] as const) {
  test(`published-site verification detects ${mode}`, async () => {
    const audio = Buffer.alloc(1200, 42);
    const server = createServer((req, res) => {
      const localized = req.url?.match(/^\/CyberShield\/audio\/(en|be)\/(.+)$/);
      if (localized) {
        const [, locale, file] = localized;
        if (file === "manifest.json")
          return res.end(
            JSON.stringify({
              "call-test-start.mp3": {
                provider: "ElevenLabs",
                language: locale,
                sha256: createHash("sha256").update(audio).digest("hex"),
              },
            }),
          );
        if (mode === "missing-localized") {
          res.statusCode = 404;
          return res.end("Not found");
        }
        if (file === "call-test-start.mp3") return res.end(audio);
      }
      switch (req.url) {
        case "/CyberShield/":
          return res.end(
            '<title>КиберЩит</title><script type="module" src="./assets/app.js"></script>',
          );
        case "/CyberShield/assets/app.js":
          return res.end("console.log('app')");
        case "/CyberShield/audio/manifest.json":
          return res.end(
            JSON.stringify({
              "call-test-start.mp3": {
                provider: "ElevenLabs",
                sha256: createHash("sha256").update(audio).digest("hex"),
              },
            }),
          );
        case "/CyberShield/audio/call-test-start.mp3":
          if (mode === "missing-audio") {
            res.statusCode = 404;
            return res.end("Not found");
          }
          return res.end(
            mode === "corrupt-audio" ? Buffer.alloc(1200, 43) : audio,
          );
        default:
          res.statusCode = 404;
          return res.end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const port = (server.address() as { port: number }).port;
      const result = verifyPublicSite(`http://127.0.0.1:${port}/CyberShield/`);
      if (mode === "valid")
        assert.deepEqual(await result, {
          url: `http://127.0.0.1:${port}/CyberShield/`,
          assets: 1,
          clips: 3,
        });
      else
        await assert.rejects(
          result,
          mode === "missing-audio" || mode === "missing-localized"
            ? /HTTP 404/
            : /hash mismatch/,
        );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
}
