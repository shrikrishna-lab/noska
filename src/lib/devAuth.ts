// Dev-only local sign-in bypass.
//
// Gives developers (and automated device testing) one-tap entry into the
// workspace without the browser-handoff flow. The fake session is LOCAL ONLY:
// Supabase RLS rejects its token, so the app runs in the same local/offline
// mode as an unreachable backend — pages live in localStorage until a real
// sign-in happens.
//
// Safety: `isDevBypassAvailable()` is true only in dev builds
// (import.meta.env.DEV — never true for production builds), so the bypass
// UI and this module's write path are structurally unreachable in prod.

import { saveSession, toIdentity } from "./desktop/pairing";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** True only in development builds — the bypass UI keys off this. */
export function isDevBypassAvailable(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Creates a local fake session (same store the browser-handoff flow uses).
 * The app treats it exactly like a paired session; all Supabase calls will
 * 401 and fall back to local storage — intended, this is a LOCAL dev login.
 */
export function devSignInLocal(displayName = "Dev Tester"): void {
  if (!isDevBypassAvailable()) {
    throw new Error("devSignInLocal is only available in development builds");
  }
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${displayName.trim().toLowerCase().replace(/\s+/g, ".") || "dev.tester"}@dev.noska.local`;
  saveSession({
    access_token: "dev-local-token",
    sid: `dev-${uuid}`,
    expires_at: Date.now() + YEAR_MS, // never auto-refresh mid-session
    identity: toIdentity({ id: uuid, email, fullName: displayName.trim() || "Dev Tester", imageUrl: null }),
  });
}
