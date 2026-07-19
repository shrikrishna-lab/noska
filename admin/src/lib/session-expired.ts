import { useEffect } from "react";
import notify from "@/lib/notify";
import { setAdminToken } from "@/lib/supabase";

// ─── Types ───

export const SESSION_EXPIRED_EVENT = "noska:session-expired";

export interface SessionExpiredDetail {
  reason: string;
  /** ISO timestamp of when the expiry was detected */
  at: string;
  /** Source of detection — "fetch" | "react-query" | "manual" */
  source: "fetch" | "react-query" | "manual";
}

// ─── Internal state ───

/**
 * Module-level flag that ensures only ONE toast + ONE redirect fires
 * even if a dozen in-flight RPCs all return 42501 simultaneously.
 *
 * Reset via `resetSessionExpiredFlag()` — called by `AuthProvider` on
 * successful re-login so subsequent expiries are detected again.
 */
let _notified = false;

/**
 * Wire the low-level "unauthorized detected" event from the fetch
 * wrapper in supabase.ts to the high-level session-expired flow.
 *
 * This is intentionally a side-effecting bootstrap so both layers stay
 * decoupled: supabase.ts never imports this module (avoids a cycle),
 * it just dispatches a CustomEvent. This module owns the response.
 *
 * Runs once on module load; safe in SSR (guarded by typeof window).
 */
if (typeof window !== "undefined") {
  window.addEventListener("noska:unauthorized-detected", (e) => {
    const detail = (e as CustomEvent<{ reason?: string; source?: string; url?: string }>).detail;
    triggerSessionExpired(detail?.reason ?? "UNAUTHORIZED", "fetch");
  });
}

/**
 * Tests whether a thrown error looks like the PostgREST "UNAUTHORIZED"
 * envelope returned by `require_admin_role` in the database.
 *
 * PostgREST error shape (parsed from the response body or surfaced via
 * supabase-js as `error.code` / `error.message`):
 *   { code: "42501", message: "UNAUTHORIZED", details: null, hint: null }
 *
 * We intentionally match loosely — any of these triggers detection:
 *   - error.code === "42501" + message includes "UNAUTHORIZED"
 *   - error.message === "UNAUTHORIZED"
 *   - string form contains "JWT" + "expired"
 */
export function isUnauthorizedError(err: unknown): boolean {
  if (!err) return false;

  // Supabase / PostgREST error objects expose { code, message }
  if (typeof err === "object") {
    const e = err as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" ? e.code : "";
    const message = typeof e.message === "string" ? e.message : "";

    if (code === "42501" && /UNAUTHORIZED|invalid|expired/i.test(message)) return true;
    if (message === "UNAUTHORIZED") return true;
    if (code === "PGRST301" && /jwt|expired/i.test(message)) return true;
  }

  // Plain Error / string
  const str = err instanceof Error ? err.message : String(err);
  return /^UNAUTHORIZED$/i.test(str) || /jwt.*expired|expired.*jwt/i.test(str);
}

// ─── Public API ───

/**
 * Trigger the session-expired flow. Idempotent within a "session" —
 * the first call fires the toast + event + token clear; subsequent
 * calls are no-ops until `resetSessionExpiredFlag()` is called.
 *
 * Safe to call from anywhere (fetch wrapper, React Query cache, manual).
 */
export function triggerSessionExpired(
  reason: string,
  source: SessionExpiredDetail["source"] = "manual",
): void {
  if (_notified) return;
  _notified = true;

  // 1. Clear the token immediately so no further RPCs reuse it
  setAdminToken(null);

  // 2. Show exactly one toast (using the redesigned Dynamic Info style)
  notify.warning("Session expired", "Please sign in again to continue.");

  // 3. Notify any listeners (AuthProvider) to flip user → null
  if (typeof window !== "undefined") {
    const detail: SessionExpiredDetail = {
      reason,
      at: new Date().toISOString(),
      source,
    };
    window.dispatchEvent(
      new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, { detail }),
    );
  }
}

/**
 * Reset the de-dupe flag. Called by `AuthProvider` after a successful
 * sign-in so future expiries are detected normally.
 */
export function resetSessionExpiredFlag(): void {
  _notified = false;
}

/**
 * React hook that subscribes to the session-expired event.
 * Returns the latest detail, or null if no expiry has fired.
 *
 * Used by `AuthProvider` to call `setUser(null)` + `queryClient.clear()`.
 */
export function useSessionExpiredListener(
  onExpired: (detail: SessionExpiredDetail) => void,
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<SessionExpiredDetail>;
      if (ce.detail) onExpired(ce.detail);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handler as EventListener);
  }, [onExpired]);
}
