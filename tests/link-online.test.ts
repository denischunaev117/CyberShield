import test from "node:test";
import assert from "node:assert/strict";
import {
  checkOnline,
  linkCheckEndpoint,
  prepareOnlineAddress,
  readOnlineResult,
} from "../src/features/link-check/online";

function clean(verdict = "no_known_threats") {
  return {
    verdict,
    provider: "google-safe-browsing",
    checkedAt: new Date().toISOString(),
    threatTypes: verdict === "dangerous" ? ["SOCIAL_ENGINEERING"] : [],
    scope: "submitted-url-only",
    redirectsChecked: false,
  };
}

test("online check sends only an explicitly selected address to the fixed Worker", async () => {
  let calls = 0;
  const value = "ozon-zakaz.by";
  const result = await checkOnline(
    value,
    new AbortController().signal,
    async (url, init) => {
      calls++;
      assert.equal(url, linkCheckEndpoint);
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "omit");
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store");
      assert.equal(init.referrerPolicy, "no-referrer");
      assert.deepEqual(JSON.parse(String(init.body)), {
        url: "https://ozon-zakaz.by/",
        consent: true,
      });
      return Response.json(clean());
    },
  );
  assert.equal(calls, 1);
  assert.equal(value, "ozon-zakaz.by");
  assert.equal(result.verdict, "no_known_threats");
});

for (const value of [
  "https://user:secret@example.com/",
  "https://example.com/?token=personal",
  "https://example.com/?access_token=personal",
  "https://example.com/?code=personal",
  "https://example.com/?password=personal",
  "https://example.com/#access_token=personal",
  "https://example.com/#/reset?token=personal",
  "https://127.1/",
  "https://[::1]/",
  "https://localhost/",
  "https://device.local/",
  "javascript:alert(1)",
  "https://example.com/\u200b",
  "https://exa\\mple.com/",
])
  test(`online check refuses sensitive or unsupported input before the network: ${value}`, async () => {
    await assert.rejects(
      checkOnline(value, new AbortController().signal, async () => {
        assert.fail("unsupported addresses must not be transmitted");
      }),
    );
  });

test("ordinary URL parameters and international domain retain their meaning", () => {
  const raw = "https://прыклад.бел/path?product=123#section";
  const normalized = new URL(prepareOnlineAddress(raw));
  assert.equal(normalized.hostname, new URL(raw).hostname);
  assert.equal(normalized.search, "?product=123");
  assert.equal(normalized.hash, "#section");
});

for (const data of [
  null,
  {},
  [],
  { ...clean(), verdict: "safe" },
  { ...clean(), provider: "unknown" },
  { ...clean(), threatTypes: ["SOCIAL_ENGINEERING"] },
  { ...clean("dangerous"), threatTypes: [] },
  { ...clean("dangerous"), threatTypes: ["UNKNOWN"] },
  { ...clean(), checkedAt: "yesterday" },
  {
    ...clean(),
    checkedAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
  },
  {
    ...clean(),
    checkedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  },
  { ...clean(), scope: "whole-internet" },
  { ...clean(), redirectsChecked: true },
])
  test(`malformed or stale result is never accepted: ${JSON.stringify(data)}`, () => {
    assert.throws(() => readOnlineResult(data));
  });

test("confirmed phishing is preserved as a qualified threat result", () => {
  const result = readOnlineResult(clean("dangerous"));
  assert.equal(result.verdict, "dangerous");
  assert.deepEqual(result.threatTypes, ["SOCIAL_ENGINEERING"]);
});

for (const status of [400, 403, 429, 500, 503])
  test(`HTTP ${status} cannot become a positive verdict`, async () => {
    await assert.rejects(
      checkOnline("example.com", new AbortController().signal, async () =>
        Response.json(clean(), { status }),
      ),
    );
  });

test("network and invalid JSON failures have useful messages without upstream text", async () => {
  await assert.rejects(
    checkOnline("example.com", new AbortController().signal, async () => {
      throw new TypeError("untrusted upstream detail");
    }),
    /Нет связи/,
  );
  await assert.rejects(
    checkOnline(
      "example.com",
      new AbortController().signal,
      async () => new Response("not JSON"),
    ),
    /неполный или устаревший/,
  );
});

test("caller abort reaches the transport and cannot produce a positive result", async () => {
  const controller = new AbortController();
  const pending = checkOnline(
    "example.com",
    controller.signal,
    async (_url, init) => {
      return await new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    },
  );
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
