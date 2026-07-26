import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/control/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5174,
    strictPort: true
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) return "vendor";
          if (id.includes("node_modules/react")) return "vendor";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@supabase/supabase-js")) return "supabase";
          if (id.includes("node_modules/@tanstack/react-query") || id.includes("node_modules/@tanstack/react-table")) return "query";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (id.includes("node_modules/@radix-ui")) return "radix";
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod")) return "forms";
          if (id.includes("node_modules/@dnd-kit")) return "dnd";
          if (id.includes("node_modules/lucide-react")) return "icons";
        }
      }
    }
  }
});
