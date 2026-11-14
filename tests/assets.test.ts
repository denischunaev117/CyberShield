import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAsset } from "../src/platform/assets";
test("audio resolves at both a root host and GitHub Pages subdirectory", () => {
  assert.equal(
    publicAsset("/audio/voice.mp3", "./", "https://example.test/"),
    "/audio/voice.mp3",
  );
  assert.equal(
    publicAsset("/audio/voice.mp3", "./", "https://example.test/CyberShield/"),
    "/CyberShield/audio/voice.mp3",
  );
  assert.equal(
    publicAsset(
      "/audio/voice.mp3",
      "./",
      "https://example.test/CyberShield/index.html",
    ),
    "/CyberShield/audio/voice.mp3",
  );
});
test("packaged media also resolves against a local Android WebView origin", () =>
  assert.equal(
    publicAsset("/audio/voice.mp3", "./", "capacitor://localhost/"),
    "/audio/voice.mp3",
  ));
