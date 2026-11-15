import jsQR from "jsqr";
export const maxImageBytes = 10 * 1024 * 1024;
export function imageAllowed(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error(
      "Выберите изображение PNG, JPEG или WebP. SVG и другие форматы не открываются.",
    );
  if (file.size > maxImageBytes)
    throw Error("Изображение слишком большое: максимум 10 МБ.");
}
export async function imagePixels(file: File): Promise<ImageData> {
  imageAllowed(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 24_000_000)
      throw Error(
        "Разрешение изображения слишком большое. Выберите уменьшенную копию.",
      );
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw Error("Браузер не поддерживает чтение изображения.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
}
export function decodeQr(pixels: ImageData): string | null {
  return (
    jsQR(pixels.data, pixels.width, pixels.height, {
      inversionAttempts: "attemptBoth",
    })?.data ?? null
  );
}
export function linksFromText(text: string): string[] {
  const matches =
    text.match(
      /(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"']+|(?:[а-яёіўa-z0-9-]+\.)+(?:by|бел|ru|рф|com|org|net|info|site|online|xyz|me|io)(?:\/[^\s<>"']*)?/giu,
    ) ?? [];
  return [...new Set(matches.map((s) => s.replace(/[.,;!?)\]}]+$/g, "")))]
    .filter((s) => s.length <= 4096)
    .slice(0, 12);
}
