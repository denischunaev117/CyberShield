import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
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
