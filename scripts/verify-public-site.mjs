/* global URL, fetch, AbortSignal, Buffer, process, console, setTimeout */
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export async function verifyPublicSite(address) {
  const base = new URL(address.endsWith("/") ? address : `${address}/`);
  async function read(path) {
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      throw new Error(`Asset outside the published site: ${url}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const html = (await read("./")).toString("utf8");
  if (!html.includes("КиберЩит") || !/<script[^>]+type="module"/.test(html))
    throw new Error(
      "The public response is not the CyberShield production page",
    );
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    (m) => m[1],
  );
  if (!assets.length) throw new Error("Production assets are missing");
  for (const path of assets) {
    if (!(await read(path)).length) throw new Error(`Empty asset: ${path}`);
  }
  const manifest = JSON.parse(
    (await read("audio/manifest.json")).toString("utf8"),
  );
  const clips = Object.entries(manifest);
  if (!clips.length) throw new Error("Audio manifest is empty");
  for (const [file, record] of clips) {
    if (!/^[a-z0-9-]+\.mp3$/.test(file) || record.provider !== "ElevenLabs")
      throw new Error("Invalid audio manifest entry");
    const bytes = await read(`audio/${file}`);
    if (
      bytes.length <= 1000 ||
      createHash("sha256").update(bytes).digest("hex") !== record.sha256
    )
      throw new Error(`Audio hash mismatch: ${file}`);
  }
  return { url: base.href, assets: assets.length, clips: clips.length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.argv[2])
    throw new Error("Usage: node scripts/verify-public-site.mjs SITE_URL");
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      console.log(JSON.stringify(await verifyPublicSite(process.argv[2])));
      process.exit(0);
    } catch (error) {
      lastError = error;
      console.error(`Public site check ${attempt + 1}/6: ${error.message}`);
      if (attempt < 5)
        await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  throw lastError;
}
