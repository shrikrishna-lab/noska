import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

// Credentials MUST come from environment variables (set in .env locally and in
// the Vercel project settings for production). No hardcoded project fallback —
// that would bake a specific project ref into the shipped bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev; in prod this surfaces a clear console error instead of
  // silently connecting to the wrong (or a stale) project.
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Set them in your .env (local) and Vercel project settings (production)."
  );
}

export const supabase = createClient<Database>(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
