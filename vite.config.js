import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const httpsConfig = process.env.VITE_HTTPS_KEY && process.env.VITE_HTTPS_CERT
  ? {
      key: fs.readFileSync(path.resolve(process.env.VITE_HTTPS_KEY.trim())),
      cert: fs.readFileSync(path.resolve(process.env.VITE_HTTPS_CERT.trim())),
    }
  : undefined;

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
    strictPort: true,
    allowedHosts: ["app.noska.me", "localhost", "127.0.0.1", "app.localhost"],
    https: httpsConfig,
  },
  build: {
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router") || id.includes("node_modules/scheduler")) return "react-vendor";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@clerk")) return "clerk";
          if (id.includes("node_modules/@sentry")) return "sentry";
          if (id.includes("node_modules/posthog")) return "posthog";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/@dnd-kit")) return "dnd";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/@radix-ui")) return "ui";
          if (id.includes("node_modules/tiptap") || id.includes("node_modules/@tiptap")) return "editor";
          if (id.includes("node_modules/recharts") || id.includes("node_modules/echarts") || id.includes("node_modules/d3-")) return "charts";
          if (id.includes("node_modules/katex") || id.includes("node_modules/mermaid") || id.includes("node_modules/highlight.js") || id.includes("node_modules/shiki")) return "markup";
          if (id.includes("node_modules/lenis") || id.includes("node_modules/gsap")) return "animation";
          if (id.includes("node_modules/encoding") || id.includes("node_modules/crypto-js") || id.includes("node_modules/@noble")) return "crypto";
          if (id.includes("node_modules/slate")) return "slate";
          if (id.includes("node_modules/pdf-lib")) return "pdf";
          if (id.includes("node_modules/cytoscape")) return "graph";
          if (id.includes("node_modules/dompurify") || id.includes("node_modules/sanitize")) return "security";
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  }
});
