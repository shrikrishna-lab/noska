// TEMPORARY vite config for mobile UI E2E on http localhost.
// MOBILE_TEST_MODE=1 forces TEST_MODE (localStorage-only workspace, auth bypassed).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const testMode = process.env.MOBILE_TEST_MODE === "1";

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  define: {
    "import.meta.env.VITE_TEST_MODE": JSON.stringify(testMode ? "true" : "false"),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      testMode ? "http://localhost:51999" : "https://yxgtmzksnyarlivgxujf.supabase.co",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@clerk/react": path.resolve(__dirname, "./src/dev-clerk-stub.tsx"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5188,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**", "**/dist*/**", "**/node_modules/**"] },
  },
});
