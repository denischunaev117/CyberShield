import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react({ jsxImportSource: "@cybershield/i18n" })],
  resolve: {
    alias: {
      "@cybershield/i18n": fileURLToPath(
        new URL("./src/i18n", import.meta.url),
      ),
    },
  },
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /\/node_modules\/(?:tesseract.js|bmp-js|idb-keyval|is-url|node-fetch|regenerator-runtime|wasm-feature-detect|zlibjs)\//.test(
              id,
            )
          )
            return "ocr-runtime";
          if (/\/node_modules\/(?:tldts|tldts-core|tr46|punycode)\//.test(id))
            return "url-analysis";
          if (id.includes("/node_modules/jsqr/")) return "qr-reader";
          if (id.includes("/node_modules/qrcode/")) return "qr-code";
          if (id.includes("/node_modules/"))
            return /\/(react|react-dom|scheduler)\//.test(id)
              ? "react-vendor"
              : "vendor";
          if (id.includes("/src/content/authoring.ts"))
            return "scenario-authoring";
          const match = id.match(/\/src\/content\/(batch-[^/]+)\.ts$/);
          if (match) return "scenarios-" + match[1];
        },
      },
    },
  },
});
