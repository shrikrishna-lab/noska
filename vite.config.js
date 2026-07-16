import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    // Fail fast instead of silently moving to another port (5174, 5175, ...)
    // when 5173 is taken by an unrelated process. A shifting port breaks the
    // Supabase OAuth redirect, which is configured against a fixed
    // http://localhost:5173 URL in the Supabase dashboard.
    strictPort: true
  },
  build: {
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
    chunkSizeWarningLimit: 1200
  }
});

