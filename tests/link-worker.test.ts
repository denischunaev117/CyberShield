import test from "node:test";
import assert from "node:assert/strict";
// Self-contained deployment file is JavaScript, so it needs no Worker SDK.
// @ts-expect-error The standalone module intentionally has no type declaration.
import { createWorker } from "../workers/link-check/worker.mjs";

const origin = "https://denischunaev117.github.io";
const env = { GOOGLE_SAFE_BROWSING_API_KEY: "test-secret-not-a-real-key" };
function request(
  body: unknown = { url: "example.com", consent: true },
  headers: Record<string, string> = {},
) {
  return new Request("https://worker.example/check", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function workerWith(data: unknown, status = 200) {
  return createWorker({
    requestGoogle: async () => Response.json(data, { status }),
  });
}

test("worker checks only Google's API, normalizes scheme, never exposes key or input", async () => {
  let called = false;
  const worker = createWorker({
    now: () => 1000,
    requestGoogle: async (address: string, init: RequestInit) => {
      called = true;
      const api = new URL(address);
      assert.equal(api.origin, "https://safebrowsing.googleapis.com");
      assert.equal(api.pathname, "/v4/threatMatches:find");
      assert.equal(
        api.searchParams.get("key"),
        env.GOOGLE_SAFE_BROWSING_API_KEY,
      );
      assert.equal(init.method, "POST");
      assert.equal(init.redirect, "manual");
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body.threatInfo.threatEntries, [
        { url: "https://example.com/" },
      ]);
      return Response.json({});
    },
  });
  const response = await worker.fetch(request(), env);
  const body = await response.json();
  assert.ok(called);
  assert.equal(response.status, 200);
  assert.equal(body.verdict, "no_known_threats");
  assert.equal(body.checkedAt, "1970-01-01T00:00:01.000Z");
  assert.equal(body.redirectsChecked, false);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.ok(!JSON.stringify(body).includes(env.GOOGLE_SAFE_BROWSING_API_KEY));
  assert.ok(!JSON.stringify(body).includes("example.com"));
});

test("worker reports confirmed phishing", async () => {
  const worker = workerWith({
    matches: [
      {
        threatType: "SOCIAL_ENGINEERING",
        threatEntryType: "URL",
        threat: { url: "https://example.com/" },
      },
    ],
  });
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).threatTypes, ["SOCIAL_ENGINEERING"]);
  const second = await worker.fetch(request(), env);
  assert.equal((await second.json()).verdict, "dangerous");
});

for (const data of [
  null,
  [],
  { error: {} },
  { unexpected: true },
  { matches: null },
  { matches: [{}] },
  { matches: [{ threatType: "UNKNOWN" }] },
])
  test(`worker never returns green for malformed provider data ${JSON.stringify(data)}`, async () => {
    const response = await workerWith(data).fetch(request(), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).verdict, "unavailable");
  });

for (const status of [400, 401, 403, 429, 500])
  test(`worker never returns green for upstream HTTP ${status}`, async () => {
    const response = await workerWith({}, status).fetch(request(), env);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.verdict, "unavailable");
    assert.equal(
      body.error,
      status === 429 ? "provider_quota" : "provider_error",
    );
  });

test("worker uses Cloudflare-supported mode and refuses a redirect from Google", async () => {
  let calls = 0;
  const worker = createWorker({
    requestGoogle: async (address: string, init: RequestInit) => {
      calls++;
      assert.equal(new URL(address).origin, "https://safebrowsing.googleapis.com");
      // Workers supports follow/manual, but throws for the Node-supported error mode.
      if (init.redirect !== "manual")
        throw new TypeError("Unsupported or unsafe redirect mode");
      return new Response(null, {
        status: 302,
        headers: { Location: "https://untrusted.example/" },
      });
    },
  });
  const response = await worker.fetch(request(), env);
  assert.equal(calls, 1);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    verdict: "unavailable",
    error: "provider_error",
  });
});

test("worker handles network failure and timeout without exposing errors", async () => {
  const worker = createWorker({
    requestGoogle: async () => {
      throw new Error(env.GOOGLE_SAFE_BROWSING_API_KEY);
    },
  });
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    verdict: "unavailable",
    error: "provider_unavailable",
  });
});

test("worker refuses other origins and missing consent before contacting Google", async () => {
  const worker = createWorker({
    requestGoogle: () => assert.fail("must not call provider"),
  });
  const foreign = await worker.fetch(
    request(undefined, { Origin: "https://other.example" }),
    env,
  );
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get("Access-Control-Allow-Origin"), null);
  const missingConsent = await worker.fetch(
    request({ url: "example.com" }),
    env,
  );
  assert.equal(missingConsent.status, 400);
  assert.equal((await missingConsent.json()).error, "consent_required");
});

for (const url of [
  "",
  "javascript:alert(1)",
  "data:text/plain,hi",
  "http://user:password@example.com/",
  "http://127.1/",
  "http://[::1]/",
  "http://localhost/",
  "https://service.internal/",
  "https://example.com/\u200b",
  "https://example.com/\u0000hidden",
  "https://exa\\mple.com",
  "a".repeat(4097),
])
  test(`worker rejects unsupported input ${url.slice(0, 60)}`, async () => {
    const worker = createWorker({
      requestGoogle: () => assert.fail("must not call provider"),
    });
    const response = await worker.fetch(request({ url, consent: true }), env);
    assert.equal(response.status, 400);
  });

test("worker bounds input size, JSON and content type", async () => {
  const worker = createWorker({
    requestGoogle: () => assert.fail("must not call provider"),
  });
  assert.equal(
    (
      await worker.fetch(
        request({ url: "x".repeat(20000), consent: true }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (await worker.fetch(request([], { "CF-Connecting-IP": "192.0.2.2" }), env))
      .status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        request(undefined, { "Content-Type": "text/plain" }),
        env,
      )
    ).status,
    415,
  );
});

test("worker limits repeat requests and recovers after the window", async () => {
  let now = 0;
  let calls = 0;
  const worker = createWorker({
    now: () => now,
    requestGoogle: async () => {
      calls++;
      return Response.json({});
    },
  });
  for (let i = 0; i < 10; i++)
    assert.equal((await worker.fetch(request(), env)).status, 200);
  const limited = await worker.fetch(request(), env);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  assert.equal(calls, 10);
  now = 60000;
  assert.equal((await worker.fetch(request(), env)).status, 200);
});

test("health does not test Google, expose secrets or claim a completed check", async () => {
  const worker = createWorker({
    requestGoogle: () => assert.fail("must not call provider"),
  });
  const response = await worker.fetch(
    new Request("https://worker.example/health"),
    env,
  );
  const body = await response.json();
  assert.equal(body.configured, true);
  assert.equal(body.verdict, undefined);
  assert.ok(!JSON.stringify(body).includes(env.GOOGLE_SAFE_BROWSING_API_KEY));
  const absent = await worker.fetch(request(), {});
  assert.equal(absent.status, 503);
});

test("preflight is limited to the production origin", async () => {
  const worker = workerWith({});
  const response = await worker.fetch(
    new Request("https://worker.example/check", {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Access-Control-Allow-Headers"),
    "Content-Type",
  );
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
});
