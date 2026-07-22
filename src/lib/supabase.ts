import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

// Credentials MUST come from environment variables (set in .env locally and in
// the Vercel project settings for production). No hardcoded project fallback —
// that would bake a specific project ref into the shipped bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Set them in your .env (local) and Vercel project settings (production)."
  );
}

// Module-level getter set once from App.tsx when the Clerk session is available.
// Supabase's createClient accepts an accessToken callback that is called on every
// request, injecting the Clerk session token into the Authorization header.
let clerkGetToken: (() => Promise<string | null>) | null = null;

export function setClerkSessionToken(getter: () => Promise<string | null>) {
  clerkGetToken = getter;
}

export const supabase = createClient<Database>(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
  accessToken: async () => {
    if (clerkGetToken) {
      return clerkGetToken();
    }
    return null;
  },
});
