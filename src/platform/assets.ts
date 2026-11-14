/** Resolve bundled media under a root site, a subdirectory or an Android WebView. */
export function publicAsset(
  path: string,
  base = import.meta.env.BASE_URL,
  pageUrl = document.baseURI,
): string {
  return new URL(path.replace(/^\/+/, ""), new URL(base, pageUrl)).pathname;
}
