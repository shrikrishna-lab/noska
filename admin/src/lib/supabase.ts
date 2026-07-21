import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasRealCredentials = Boolean(url && key);

// ─── Token storage ───

let _adminToken: string | null = null;

export function setAdminToken(token: string | null) {
  _adminToken = token;
  if (token) sessionStorage.setItem("noska_admin_token", token);
  else sessionStorage.removeItem("noska_admin_token");
}

export function getAdminToken(): string | null {
  if (!_adminToken) _adminToken = sessionStorage.getItem("noska_admin_token");
  return _adminToken;
}

// ─── Session-expiry detection (fetch wrapper) ───
//
// PostgREST signals an expired/invalid admin session (rejected by
// `require_admin_role`) as HTTP 401 with body
//   { code: "42501", message: "UNAUTHORIZED", ... }
// We catch this at the fetch layer so EVERY code path (rpc, .from(),
// .functions.invoke) is covered, regardless of whether the caller
// throws the error to React Query.
//
// Auth-flow RPCs are excluded because they are EXPECTED to return 42501
// during the login / setup / logout flow itself.

const AUTH_FLOW_RPC_ALLOWLIST = [
  "admin_login",
  "admin_logout",
  "validate_admin_session",
  "setup_first_admin",
  "check_admin_exists",
];

function isAuthFlowRpc(requestUrl: string): boolean {
  try {
    const u = new URL(requestUrl);
    // PostgREST RPC path looks like /rest/v1/rpc/<func_name>
    const match = u.pathname.match(/\/rpc\/([^/?]+)/);
    if (!match) return false;
    return AUTH_FLOW_RPC_ALLOWLIST.includes(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}

async function detectUnauthorized(response: Response, requestUrl: string): Promise<void> {
  // Quick reject: only inspect 401/403 responses on RPC or Function paths
  if (response.status !== 401 && response.status !== 403) return;
  if (isAuthFlowRpc(requestUrl)) return;

  // Clone so we don't consume the body for the real caller
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    return; // not JSON — not our shape
  }

  const err = body as { code?: string; message?: string } | null;
  if (!err || typeof err !== "object") return;

  // Distinguish between UNAUTHORIZED (session expired / invalid token)
  // and TABLE_NOT_ALLOWED (table not in allow-list). Both use code 42501
  // but only UNAUTHORIZED should trigger session expiry.
  const msg = typeof err.message === "string" ? err.message : "";
  const isSessionExpired =
    msg === "UNAUTHORIZED" ||
    /jwt.*expired|expired.*jwt/i.test(msg);

  if (isSessionExpired) {
    // Defer to the session-expired module via a CustomEvent so we don't
    // create an import cycle. The `triggerSessionExpired` function lives
    // in session-expired.ts and listens for this event.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("noska:unauthorized-detected", {
          detail: {
            reason: err.message || "UNAUTHORIZED",
            source: "fetch",
            url: requestUrl,
          },
        }),
      );
    }
  }
}

const wrappedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  // Fire-and-forget detection — never let inspection break the response
  try {
    const requestUrl = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : "";
    if (requestUrl) {
      void detectUnauthorized(response, requestUrl);
    }
  } catch {
    // swallow — never let detection break the actual request
  }
  return response;
};

// ─── Supabase client ───

export const supabase = hasRealCredentials
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: wrappedFetch },
    })
  : null;

export const SUPABASE_ENABLED = hasRealCredentials;
export const DEMO_MODE = !hasRealCredentials || String(import.meta.env.VITE_ADMIN_DEMO).toLowerCase() === "true";
