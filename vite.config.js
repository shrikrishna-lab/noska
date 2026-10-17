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
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: process.env.VITE_APP_VERSION
            ? `noska@${process.env.VITE_APP_VERSION}`
            : undefined,
          telemetry: false,
          sourcemaps: {
            filesToDeleteAfterUpload: [
              "dist/assets/**/*.map",
              "dist/control/assets/**/*.map",
              "dist-desktop/assets/**/*.map",
              "dist-mobile/assets/**/*.map",
            ],
          },
        })]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    // Mobile dev (`tauri android/ios dev`) sets TAURI_DEV_HOST so the device
    // or emulator can reach this dev server over the network.
    host: process.env.TAURI_DEV_HOST || undefined,
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
    ...(isTauri && {
      target:
        process.env.TAURI_ENV_PLATFORM === "windows" ||
        process.env.TAURI_ENV_PLATFORM === "android"
          ? "chrome105"
          : "safari13",
    }),
    minify: "oxc",
    cssMinify: "lightningcss",
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType !== "html") return deps;
        return deps.filter((dep) => !dep.includes("lucide-react"));
      },
    },
    rolldownOptions: {
      external: ["@xenova/transformers"],
      output: {
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)(?:[\\/]|$)/, priority: 30 },
            { name: "clerk", test: /node_modules[\\/]@clerk[\\/]/, priority: 25 },
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/, priority: 25 },
            { name: "sentry", test: /node_modules[\\/]@sentry[\\/]/, priority: 25 },
            { name: "posthog", test: /node_modules[\\/]posthog-js[\\/]/, priority: 25 },
            { name: "dnd", test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 20 },
            { name: "ui", test: /node_modules[\\/]@radix-ui[\\/]/, priority: 20 },
            // NOTE: lucide-react is intentionally NOT grouped into a single
            // chunk. A shared "icons" bundle pulled every icon used anywhere in
            // the app into the eagerly-loaded graph (~640 kB), including icons
            // only used by lazy routes. Left to rolldown's natural splitting,
            // icons live with the dynamic boundary that first needs them.
            { name: "katex", test: /node_modules[\\/](?:katex|@hugeicons)[\\/]/, priority: 15 },
            { name: "diagrams", test: /node_modules[\\/](?:mermaid|cytoscape|dagre|@dagrejs)[\\/]/, priority: 15 },
            { name: "three", test: /node_modules[\\/]three[\\/]/, priority: 15 },
          ],
        },
      },
    },
  }
});
