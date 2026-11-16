import {
  CapacitorHttp,
  type HttpOptions,
  type HttpResponse,
} from "@capacitor/core";

const endpoint =
  "https://cybershield-link-check.chunaevdenis.workers.dev/check";
type Http = (options: HttpOptions) => Promise<HttpResponse>;

/** Narrow native transport: only the public CyberShield service, never a pasted host. */
export async function nativeOnlineRequest(
  url: string,
  init: RequestInit,
  http: Http = CapacitorHttp.request,
): Promise<Response> {
  if (
    url !== endpoint ||
    init.method !== "POST" ||
    typeof init.body !== "string"
  )
    throw new TypeError("Unsupported native request");
  if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const data: unknown = JSON.parse(init.body);
  if (
    !data ||
    typeof data !== "object" ||
    !("consent" in data) ||
    data.consent !== true
  )
    throw new TypeError("Explicit consent required");
  let result: HttpResponse;
  try {
    result = await http({
      url: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      "User-Agent": navigator.userAgent,
        // Native clients do not have a browser origin. This identifies our own service client.
        Origin: "https://denischunaev117.github.io",
      },
      data,
      responseType: "json",
      disableRedirects: true,
      connectTimeout: 8000,
      readTimeout: 12000,
    });
  } catch {
    if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new TypeError("Native online request failed");
  }
  if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return new Response(JSON.stringify(result.data), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}
