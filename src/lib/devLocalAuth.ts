/**
 * Dev-only: sign in to the local Supabase stack so a browser session runs
 * against real rows with a real JWT, which means RLS is genuinely evaluated.
 *
 * Without it, TEST_MODE skips Supabase entirely and hydrates from localStorage,
 * so owner-scoped behaviour, permissions and sharing cannot be exercised at all.
 *
 * Active only when VITE_TEST_MODE is on AND explicit credentials are supplied —
 * and envGuard already refuses to boot TEST_MODE against the production
 * project, so this can never run against real data.
 */
import { setClerkSessionToken } from "./supabase";

const EMAIL = String(import.meta.env?.VITE_TEST_USER_EMAIL ?? "").trim();
const PASSWORD = String(import.meta.env?.VITE_TEST_USER_PASSWORD ?? "");
const SUPABASE_URL = String(import.meta.env?.VITE_SUPABASE_URL ?? "");
const ANON_KEY = String(import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "");

export function hasLocalTestCredentials(): boolean {
  return Boolean(EMAIL && PASSWORD && SUPABASE_URL && ANON_KEY);
}

export type LocalTestIdentity = { userId: string; email: string };

/**
 * Signs in through the Auth REST endpoint rather than `supabase.auth`:
 * the shared client is built with the `accessToken` option, which makes
 * supabase-js refuse session-management calls outright.
 *
 * The resulting token is handed to the same getter the Clerk path uses, so
 * every subsequent Supabase call is authenticated as this user and RLS is
 * evaluated for real.
 */
export async function signInAsLocalTestUser(): Promise<LocalTestIdentity> {
  if (!hasLocalTestCredentials()) throw new Error("Local test credentials are not configured.");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const payload = await response.json().catch(() => null);
  const accessToken = payload?.access_token as string | undefined;
  const expiresIn = Number(payload?.expires_in ?? 3600);
  if (!response.ok || !accessToken) {
    throw new Error(
      `Local test sign-in failed: ${response.status} ${payload?.error_description ?? payload?.msg ?? payload?.error ?? "no token"}`,
    );
  }

  const expiresAt = Date.now() + Math.max(30, expiresIn - 60) * 1000;
  let currentToken: string = accessToken;

  const fetchFreshToken = async () => {
    const refreshed = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    }).then((r) => r.json().catch(() => null));
    if (refreshed?.access_token) currentToken = refreshed.access_token as string;
    return currentToken;
  };

  setClerkSessionToken(async () => {
    // Refresh a minute before expiry so a long walkthrough never sees a 401.
    if (Date.now() > expiresAt) return fetchFreshToken();
    return currentToken;
  });

  const userId = (payload?.user?.id as string | undefined) ?? "";
  if (!userId) throw new Error("Local test sign-in returned no user id.");
  return { userId, email: EMAIL };
}