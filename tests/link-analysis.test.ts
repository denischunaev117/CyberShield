import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeLink,
  domainSkeleton,
} from "../src/features/link-check/analyze";
import { linksFromText } from "../src/features/link-check/media";
const cases: [string, string][] = [
  ["https://belarusbank.by.evil.example/login", "brand-imitation"],
  ["https://belarusbank.by@evil.example/", "userinfo"],
  ["https://belаrusbank.by/", "mixed-alphabets"],
  ["https://belаrusbank.by/", "brand-imitation"],
  ["https://belarusbnak.by/", "brand-imitation"],
  ["https://belarusbank-pay.by/", "brand-imitation"],
  ["https://mvd.gov.by.evil.example/", "government-imitation"],
  ["http://example.com", "insecure-http"],
  ["https://example.com:8443/login", "unusual-port"],
  ["https://bit.ly/test", "shortener"],
  ["https://evil.example/belarusbank.by/login", "brand-in-path"],
  ["https://tinyurl.com/test", "shortener"],
  [
    "https://trusted.example/?url=https%3A%2F%2Fevil.example",
    "embedded-redirect",
  ],
  [
    "https://trusted.example/?next=https%253A%252F%252Fevil.example",
    "embedded-redirect",
  ],
  ["https://2130706433/", "ip-address"],
  ["https://[::1]/", "ip-address"],
  ["https://localhost/", "non-public-host"],
  ["https://a.b.c.d.example.com/", "many-subdomains"],
  ["https://%65xample.com/", "encoded-host"],
  ["hxxps://example[.]com/", "masked-address"],
  ["https://exam\u200bple.com/", "hidden-characters"],
  ["https://example.com/app.apk", "download"],
  ["https://example.com/login#token", "fragment"],
];
for (const [input, id] of cases)
  test(`URL heuristic ${id}: ${input}`, () => {
    const result = analyzeLink(input);
    assert.ok(
      result.signals.some((s) => s.id === id),
      JSON.stringify(result),
    );
    assert.equal(result.destination, "not-requested");
  });
test("the actual registrable domain is distinguished from fake subdomain and user info", () => {
  assert.equal(
    analyzeLink("https://belarusbank.by.evil.com").domain,
    "evil.com",
  );
  assert.equal(
    analyzeLink("https://name:secret@example.com/").hostname,
    "example.com",
  );
  assert.ok(
    !JSON.stringify(
      analyzeLink("https://name:secret@example.com/?token=private"),
    ).includes("secret"),
  );
  assert.equal(
    analyzeLink("https://something.co.uk").domain,
    "something.co.uk",
  );
  assert.equal(
    analyzeLink("https://someone.github.io").domain,
    "someone.github.io",
  );
});
test("ordinary known domains and valid IDNs are never called confirmed safe", () => {
  for (const input of [
    "https://belarusbank.by/",
    "https://support.apple.com/",
    "https://prior.by/web",
    "https://example.com/",
    "https://мінск.бел/",
  ]) {
    const result = analyzeLink(input);
    assert.equal(result.level, "unknown");
    assert.equal(result.destination, "not-requested");
    assert.ok(!result.signals.some((s) => s.severity === "high"));
  }
  assert.equal(analyzeLink("example.com").inferredProtocol, true);
  assert.ok(
    !analyzeLink("https://example.com:443").signals.some(
      (s) => s.id === "unusual-port",
    ),
  );
});
test("embedded address is a syntactic clue, not a performed redirect", () => {
  const result = analyzeLink(
    "https://example.com/?next=https://other.example&url=javascript:alert(1)",
  );
  assert.deepEqual(result.redirectHosts, ["other.example"]);
  assert.equal(
    analyzeLink("https://example.com/?next=/local").redirectHosts.length,
    0,
  );
});
test("non-web QR payloads, missing hosts and oversized input are rejected without execution", () => {
  for (const value of [
    "",
    "javascript:alert(1)",
    "data:text/html,test",
    "WIFI:T:WPA;S:test;P:private;;",
    "tel:123",
    "mailto:test@example.com",
    "file:///etc/passwd",
    "https://",
    "x".repeat(4097),
  ])
    assert.throws(() => analyzeLink(value));
});
test("punycode and script evidence preserve both representations", () => {
  const result = analyzeLink("https://belаrusbank.by");
  assert.ok(result.hostname.includes("xn--"));
  assert.equal(result.unicodeHostname, "belаrusbank.by");
  assert.equal(domainSkeleton("belаrusbank"), "belarusbank");
});
test("screenshot text produces explicit bounded candidates, never opens them", () => {
  assert.deepEqual(
    linksFromText(
      "Текст https://example.com/a.\nТакже bank-check.by/pay и https://example.com/a.",
    ),
    ["https://example.com/a", "bank-check.by/pay"],
  );
  assert.equal(linksFromText("Ссылок здесь нет").length, 0);
});
test("URL inspection is deterministic and performs no requests or writes", () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw Error("Network must not be used");
  };
  try {
    const value = "https://example.com/?url=https%3A%2F%2Fevil.example";
    assert.deepEqual(analyzeLink(value), analyzeLink(value));
  } finally {
    globalThis.fetch = original;
  }
});
