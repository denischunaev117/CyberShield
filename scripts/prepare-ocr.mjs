import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { URL } from "node:url";
const require = createRequire(import.meta.url);
const root = new URL("../public/ocr/", import.meta.url);
await mkdir(new URL("core/", root), { recursive: true });
await copyFile(
  require.resolve("tesseract.js/dist/worker.min.js"),
  new URL("worker.min.js", root),
);
for (const file of ["tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm"])
  await copyFile(
    path.join(
      path.dirname(require.resolve("tesseract.js-core/package.json")),
      file,
    ),
    new URL("core/" + file, root),
  );

await copyFile(
  require.resolve("tesseract.js/dist/worker.min.js.LICENSE.txt"),
  new URL("worker.min.js.LICENSE.txt", root),
);
