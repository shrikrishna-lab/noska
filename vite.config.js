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

// When building under `tauri build`/`tauri dev`, TAURI_ENV_* variables are set.
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  // Keep the terminal clear of noise when driven by the Tauri CLI.
  clearScreen: false,
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
    proxy: {
      "/api/proxy/opencode": {
        target: "https://opencode.ai/zen/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/opencode/, ""),
        secure: false,
      },
      "/api/proxy/openrouter": {
        target: "https://openrouter.ai/api/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/openrouter/, ""),
        secure: false,
      },
      "/api/proxy/anthropic": {
        target: "https://api.anthropic.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/anthropic/, ""),
        secure: false,
      },
      "/api/proxy/openai": {
        target: "https://api.openai.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/openai/, ""),
        secure: false,
      },
      "/api/proxy/gemini": {
        target: "https://generativelanguage.googleapis.com/v1beta",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/gemini/, ""),
        secure: false,
      },
      "/api/proxy/groq": {
        target: "https://api.groq.com/openai/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/groq/, ""),
        secure: false,
      },
      "/api/proxy/deepseek": {
        target: "https://api.deepseek.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/deepseek/, ""),
        secure: false,
      },
      "/api/proxy/mistral": {
        target: "https://api.mistral.ai/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/mistral/, ""),
        secure: false,
      },
      "/api/proxy/together": {
        target: "https://api.together.xyz/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/together/, ""),
        secure: false,
      },
      "/api/proxy/xai": {
        target: "https://api.x.ai/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/xai/, ""),
        secure: false,
      },
      "/api/proxy/nvidia": {
        target: "https://integrate.api.nvidia.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/nvidia/, ""),
        secure: false,
      },
    },
    // Ignore Rust build artifacts — chokidar crashes with EBUSY on Windows
    // when tauri build outputs get locked/replaced mid-watch.
    watch: {
      ignored: ["**/src-tauri/target/**", "**/dist/**", "**/node_modules/**"],
    },
  },
  build: {
    // Match the bundled system webviews when targeting Tauri (WebView2 /
    // WKWebView / WebKitGTK); leave the default target untouched for web.
    ...(isTauri && {
      target:
        process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    }),
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
