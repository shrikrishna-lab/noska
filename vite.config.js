import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
    chunkSizeWarningLimit: 1200
  }
});

