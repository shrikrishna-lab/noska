import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

// Credentials MUST come from environment variables (set in .env locally, in
// Vercel for web, and in the release workflow for desktop builds). Missing
// values must never hard-crash module evaluation — that bricks the desktop
// app on the preloader (v1.0.7 incident) — so fall back to a placeholder and
// fail loudly at request time instead.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://env-missing.placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "env-missing";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in this build. " +
    "Requests will fail — check the build environment (.env locally, Vercel for web, " +
    "release workflow env for desktop)."
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

/** The access token the desktop app should present to Supabase/edge fns. */
export async function currentAccessToken(): Promise<string | null> {
  if (isDesktop()) return getDesktopAccessToken();
  if (clerkGetToken) return clerkGetToken();
  return null;
}

function getDesktopAccessToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  const freshForMs = 120 * 1000;
  if (s.expires_at - Date.now() > freshForMs) return Promise.resolve(s.access_token);
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshDesktopSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
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

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes("placeholder")
);

/** Extracts the authenticated user ID from the active Clerk or desktop session JWT. */
export async function getAuthUserId(): Promise<string | null> {
  const token = await currentAccessToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.sub || payload.id || payload.user_id || null;
  } catch {
    return null;
  }
}
