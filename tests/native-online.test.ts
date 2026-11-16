import test from "node:test";
import assert from "node:assert/strict";
import { nativeOnlineRequest } from "../src/platform/native-online";

const endpoint =
  "https://cybershield-link-check.chunaevdenis.workers.dev/check";
const init = () => ({
  method: "POST",
  body: JSON.stringify({ url: "https://example.com/", consent: true }),
});

test("native transport only calls our fixed service and preserves the provider result", async () => {
  const result = await nativeOnlineRequest(
    endpoint,
    init(),
    async (options) => {
      assert.equal(options.url, endpoint);
      assert.equal(
        options.headers?.Origin,
        "https://denischunaev117.github.io",
      );
      assert.equal(options.disableRedirects, true);
      assert.deepEqual(options.data, {
        url: "https://example.com/",
        consent: true,
      });
      return {
        status: 200,
        data: { verdict: "dangerous" },
        headers: {},
        url: endpoint,
      };
    },
  );
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { verdict: "dangerous" });
});

test("native transport refuses arbitrary hosts, absent consent, and aborted requests", async () => {
  const noCall = async () => {
    assert.fail("No native request should be made");
  };
  await assert.rejects(
    nativeOnlineRequest("https://example.com/", init(), noCall),
  );
  await assert.rejects(
    nativeOnlineRequest(endpoint, { method: "POST", body: "{}" }, noCall),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    nativeOnlineRequest(
      endpoint,
      { ...init(), signal: controller.signal },
      noCall,
    ),
    { name: "AbortError" },
  );
});

test("native failure is normalized without exposing SDK exception text", async () => {
  await assert.rejects(
    nativeOnlineRequest(endpoint, init(), async () => {
      throw new Error("Untrusted SDK detail");
    }),
    { name: "TypeError", message: "Native online request failed" },
  );
});

test("native response finishing after cancellation cannot produce a verdict", async () => {
  const controller = new AbortController();
  await assert.rejects(
    nativeOnlineRequest(
      endpoint,
      { ...init(), signal: controller.signal },
      async () => {
        controller.abort();
        return { status: 200, data: {}, headers: {}, url: endpoint };
      },
    ),
    { name: "AbortError" },
  );
});
