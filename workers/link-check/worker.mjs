/* global fetch, URL, Response, TextDecoder, AbortSignal */

// Self-contained Cloudflare Worker: paste this whole file into Edit code.
// Secret binding: GOOGLE_SAFE_BROWSING_API_KEY. Never put the key in this file.
const ORIGIN = "https://denischunaev117.github.io";
const ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const THREATS = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
];

async function readJson(message, limit) {
  const reader = message.body?.getReader();
  if (!reader) throw new Error("missing_body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("body_too_large");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function parseAddress(input) {
  if (
    typeof input !== "string" ||
    !input.trim() ||
    input.length > 4096 ||
    [...input.trim()].some(
      (char) =>
        char.charCodeAt(0) < 32 ||
        char.charCodeAt(0) === 127 ||
        /[\s\\\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(char),
    )
  )
    throw new Error("invalid_url");
  const raw = input.trim();
  const explicitScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  const address = new URL(explicitScheme ? raw : `https://${raw}`);
  if (
    !["http:", "https:"].includes(address.protocol) ||
    address.username ||
    address.password
  )
    throw new Error("invalid_url");
  const host = address.hostname.toLowerCase().replace(/\.$/, "");
  // This endpoint checks public DNS names. It never connects to this host.
  if (
    !host.includes(".") ||
    host.length > 253 ||
    host.startsWith("[") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|example|onion|arpa)$/.test(
      host,
    )
  )
    throw new Error("unsupported_host");
  return address.href;
}

export function createWorker({ requestGoogle = fetch, now = Date.now } = {}) {
  // Best-effort throttling within ONE isolate, not a distributed quota.
  // Keep Google's project quota configured as the upstream hard limit.
  let windowStart = now();
  let total = 0;
  const clients = new Map();
  function allow(request) {
    const current = now();
    if (current - windowStart >= 60000 || current < windowStart) {
      windowStart = current;
      total = 0;
      clients.clear();
    }
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const count = clients.get(ip) ?? 0;
    if (total >= 120 || count >= 10 || (!count && clients.size >= 1024))
      return false;
    total++;
    clients.set(ip, count + 1);
    return true;
  }

  return {
    async fetch(request, env) {
      const origin = request.headers.get("Origin");
      function reply(status, body, extra = {}) {
        return new Response(JSON.stringify(body), {
          status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            Vary: "Origin",
            ...(origin === ORIGIN
              ? { "Access-Control-Allow-Origin": ORIGIN }
              : {}),
            ...extra,
          },
        });
      }
      function unavailable(error, status = 503) {
        return reply(status, { verdict: "unavailable", error });
      }
      const path = new URL(request.url).pathname;
      if (request.method === "GET" && ["/", "/health"].includes(path))
        return reply(200, {
          service: "cybershield-link-check",
          revision: 1,
          configured: Boolean(env.GOOGLE_SAFE_BROWSING_API_KEY),
          checks: ["google-safe-browsing"],
          redirectsChecked: false,
        });
      if (path !== "/check") return reply(404, { error: "not_found" });
      if (origin !== ORIGIN) return reply(403, { error: "origin_not_allowed" });
      if (request.method === "OPTIONS")
        return reply(
          200,
          { ok: true },
          {
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        );
      if (request.method !== "POST")
        return reply(
          405,
          { error: "method_not_allowed" },
          { Allow: "POST, OPTIONS" },
        );
      if (
        request.headers.get("Content-Type")?.split(";")[0].trim() !==
        "application/json"
      )
        return reply(415, { error: "json_required" });
      if (!env.GOOGLE_SAFE_BROWSING_API_KEY)
        return unavailable("service_not_configured");
      if (!allow(request))
        return reply(
          429,
          { verdict: "unavailable", error: "rate_limited" },
          { "Retry-After": "60" },
        );

      let address;
      try {
        const body = await readJson(request, 16384);
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new Error("invalid_body");
        if (body.consent !== true)
          return reply(400, { error: "consent_required" });
        address = parseAddress(body.url);
      } catch {
        return reply(400, { error: "invalid_or_unsupported_url" });
      }

      try {
        // Only Google's fixed endpoint is contacted. No submitted site is opened.
        const endpoint = new URL(ENDPOINT);
        endpoint.searchParams.set("key", env.GOOGLE_SAFE_BROWSING_API_KEY);
        const response = await requestGoogle(endpoint.href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            client: { clientId: "cybershield", clientVersion: "2.2.0" },
            threatInfo: {
              threatTypes: THREATS,
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url: address }],
            },
          }),
        });
        if (!response.ok)
          return unavailable(
            response.status === 429 ? "provider_quota" : "provider_error",
          );
        const data = await readJson(response, 65536);
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          (Object.keys(data).length > 0 && !Array.isArray(data.matches)) ||
          "error" in data
        )
          return unavailable("invalid_provider_response");
        const matches = data.matches ?? [];
        if (
          !matches.every(
            (match) =>
              match &&
              THREATS.includes(match.threatType) &&
              match.threatEntryType === "URL" &&
              typeof match.threat?.url === "string",
          )
        )
          return unavailable("invalid_provider_response");
        return reply(200, {
          verdict: matches.length ? "dangerous" : "no_known_threats",
          provider: "google-safe-browsing",
          checkedAt: new Date(now()).toISOString(),
          threatTypes: [...new Set(matches.map((match) => match.threatType))],
          scope: "submitted-url-only",
          redirectsChecked: false,
        });
      } catch {
        // Never echo provider errors, request URLs, submitted data or the key.
        return unavailable("provider_unavailable");
      }
    },
  };
}

export default createWorker();
