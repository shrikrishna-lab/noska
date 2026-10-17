import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    pool: "threads",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules/**", "dist/**", "e2e/**", ".opencode/**", "admin/**"],
    // The default 5s is not enough for the suite's heavier integration tests
    // (assistant tools, agent scheduling, catalog sync), which drive real
    // timers and pull in large component graphs. They finish in ~2-4s on an
    // idle machine but exceed 5s under CI load, which made those files
    // intermittently red for reasons unrelated to any code change.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
