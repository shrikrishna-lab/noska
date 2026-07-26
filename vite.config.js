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
      release: process.env.VITE_APP_VERSION
        ? `noska@${process.env.VITE_APP_VERSION}`
        : undefined,
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
    strictPort: true
  },
  build: {
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router") || id.includes("node_modules/scheduler")) return "vendor";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@clerk")) return "clerk";
          if (id.includes("node_modules/@sentry")) return "sentry";
          if (id.includes("node_modules/posthog")) return "posthog";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/@dnd-kit")) return "dnd";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/@radix-ui")) return "ui";
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  }
});
