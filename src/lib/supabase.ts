import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

// Credentials MUST come from environment variables (set in .env locally and in
// the Vercel project settings for production). No hardcoded project fallback â€”
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

/* â”€â”€ Desktop pairing sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   On desktop, auth comes from browser-pairing (see lib/desktop/pairing.ts):
   a real GoTrue session is stored locally and refreshed here via the
   refresh_token grant, so RLS sees the same user identity as the web. */
import { isDesktop } from "./desktop/platform";
import { loadSession, refreshDesktopSession } from "./desktop/pairing";

let refreshInFlight: Promise<string | null> | null = null;

function refreshDesktopSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshDesktopSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** The access token the desktop app should present to Supabase/edge fns. */
export async function currentAccessToken(): Promise<string | null> {
  if (isDesktop()) return getDesktopAccessToken();
  if (clerkGetToken) return clerkGetToken();
  return null;
}

async function getDesktopAccessToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  const freshForMs = 120 * 1000;
  if (s.expires_at - Date.now() > freshForMs) return s.access_token;
  return (await refreshDesktopSession()) ?? s.access_token; // fall back to old token on transient failure
}

export const supabase = createClient<Database>(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
  accessToken: async () => {
    // Desktop paired session wins when present (no Clerk session exists there).
    if (isDesktop()) {
      const tok = await getDesktopAccessToken();
      if (tok) return tok;
      return null;
    }
    if (clerkGetToken) {
      return clerkGetToken();
    }
    return null;
  },
});

// Anon-only client â€” no Clerk JWT. Used for public operations (e.g. waitlist)
// where the anon RLS policy is sufficient and the Clerk JWT isn't trusted yet.
export const supabaseAnon = createClient<Database>(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
