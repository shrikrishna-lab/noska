// Desktop browser-pairing auth edge function — v3 (Clerk-identity parity).
//
// The web app writes rows keyed by the RAW Clerk user id (e.g. user_2abc…),
// so the desktop session must carry the SAME identity. Flow:
//
//  claim    (browser, Clerk JWT): GoTrue-verifies the token, decodes the
//           Clerk `sub`, cross-checks it against the Clerk Backend API and
//           matches emails — then links code → clerk_sub.
//  exchange (desktop): mints an HS256 Supabase JWT with sub=clerk_sub,
//           role=authenticated (PostgREST + RLS see the web identity),
//           plus a rotating refresh code for silent re-issues.
//  refresh  (desktop): swaps a valid refresh code for a fresh JWT.
//  revoke   (desktop): invalidates the refresh code.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const URL_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? "";
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET") ?? "";

const ACCESS_TTL_S = 3600;
const REFRESH_TTL_S = 14 * 24 * 3600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function httpError(status: number, error: string, message: string) {
  return { status, error, message };
}

async function rest(
  path: string,
  init: RequestInit & { key?: string } = {}
): Promise<Response> {
  const key = init.key ?? SERVICE_KEY;
  const res = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  return res;
}

/* ── pairing rows ──────────────────────────────────────────────────────── */

interface PairRow {
  code: string;
  clerk_sub: string | null;
  email: string | null;
  status: string;
  attempts: number;
  expires_at: string;
  refresh_hash: string | null;
  refresh_expires_at: string | null;
}

async function pairUpsertClaimed(code: string, sub: string, email: string | null) {
  const res = await rest("/rest/v1/desktop_auth_pairs", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      code,
      clerk_sub: sub,
      email,
      status: "claimed",
      claimed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) throw httpError(500, "pair_upsert_failed", "Could not stage pairing");
}

async function pairFind(code: string): Promise<PairRow | null> {
  const res = await rest(
    `/rest/v1/desktop_auth_pairs?code=eq.${encodeURIComponent(code)}&select=*`
  );
  const rows = (await res.json()) as PairRow[];
  return rows[0] ?? null;
}

async function pairSaveRefresh(code: string, hash: string) {
  await rest(`/rest/v1/desktop_auth_pairs?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({
      refresh_hash: hash,
      refresh_expires_at: new Date(Date.now() + REFRESH_TTL_S * 1000).toISOString(),
    }),
  });
}

async function pairByRefreshHash(hash: string): Promise<PairRow | null> {
  const res = await rest(
    `/rest/v1/desktop_auth_pairs?refresh_hash=eq.${encodeURIComponent(hash)}&select=*`
  );
  const rows = (await res.json()) as PairRow[];
  return rows[0] ?? null;
}

async function pairClearRefresh(code: string) {
  await rest(`/rest/v1/desktop_auth_pairs?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({ refresh_hash: null, refresh_expires_at: null }),
  });
}

/* ── identity verification ─────────────────────────────────────────────── */

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** GoTrue verifies the Clerk JWT (third-party auth) — proves Supabase trusts it. */
async function gotraeVerifyEmail(clerkJwt: string): Promise<string | null> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${clerkJwt}` },
  });
  if (!res.ok) throw httpError(401, "unauthorized", "Invalid or expired sign-in");
  const u = await res.json();
  if (!u?.id) throw httpError(401, "unauthorized", "Invalid or expired sign-in");
  return (u.email as string) ?? null;
}

/** Clerk Backend API cross-check: the decoded sub must be a real Clerk user. */
async function clerkUserById(sub: string): Promise<{ email: string | null; name: string | null } | null> {
  if (!CLERK_SECRET_KEY) throw httpError(500, "server_config", "CLERK_SECRET_KEY not configured");
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(sub)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  const u = await res.json();
  const primary = u?.email_addresses?.find((e: { id: string }) => e.id === u?.primary_email_address_id)
    ?? u?.email_addresses?.[0];
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || null;
  return { email: primary?.email_address ?? null, name };
}

/* ── JWT minting (HS256, project secret) ───────────────────────────────── */

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  if (!JWT_SECRET) throw httpError(500, "server_config", "JWT secret not configured");
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
}

async function issueSession(clerkSub: string, email: string | null, name: string | null) {
  const access_token = await signJwt({
    sub: clerkSub,
    role: "authenticated",
    aud: "authenticated",
    email: email ?? undefined,
    app_metadata: { provider: "clerk", noska_desktop: true },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_S,
  });
  const refresh_code = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = b64url(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(refresh_code)
  )));
  return { access_token, refresh_code, hash };
}

/* ── actions ───────────────────────────────────────────────────────────── */

async function handleClaim(code: string, clerkJwt: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);

  // 1) Supabase must trust the token (third-party Clerk auth).
  const gotrueEmail = await gotraeVerifyEmail(clerkJwt);
  // 2) Decode the raw Clerk sub (untrusted until cross-checked).
  const payload = decodeJwtPayload(clerkJwt);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) return json({ error: "unauthorized", message: "Malformed token" }, 401);
  // 3) Clerk Backend API confirms the sub exists and the emails line up.
  const clerk = await clerkUserById(sub);
  if (!clerk) return json({ error: "unauthorized", message: "Clerk user not found" }, 401);
  if (gotrueEmail && clerk.email && gotrueEmail.toLowerCase() !== clerk.email.toLowerCase()) {
    return json({ error: "unauthorized", message: "Identity mismatch" }, 401);
  }

  await pairUpsertClaimed(code, sub, clerk.email ?? gotrueEmail);
  return json({ status: "claimed", name: clerk.name });
}

async function handleExchange(code: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);
  const row = await pairFind(code);
  if (!row || row.status === "waiting") return json({ status: "pending" });
  if (row.status === "used") return json({ status: "unknown_code" });
  if (new Date(row.expires_at).getTime() < Date.now()) return json({ status: "expired" });
  if (row.attempts >= 10) return json({ status: "expired" });
  if (!row.clerk_sub) return json({ status: "pending" });

  try {
    const { access_token, refresh_code, hash } = await issueSession(
      row.clerk_sub, row.email, null
    );
    await pairSaveRefresh(code, hash);
    return json({
      status: "complete",
      session: {
        access_token,
        refresh_code,
        expires_at: Date.now() + ACCESS_TTL_S * 1000,
        identity: { id: row.clerk_sub, email: row.email },
      },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "exchange_failed", message: err.message }, err.status ?? 500);
  }
}

async function handleRefresh(refreshCode: string) {
  const hash = b64url(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(refreshCode)
  )));
  const row = await pairByRefreshHash(hash);
  if (!row || !row.clerk_sub) return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  if (row.refresh_expires_at && new Date(row.refresh_expires_at).getTime() < Date.now()) {
    await pairClearRefresh(row.code);
    return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  }
  const { access_token, refresh_code, hash: newHash } = await issueSession(
    row.clerk_sub, row.email, null
  );
  await pairSaveRefresh(row.code, newHash); // rotation
  return json({
    status: "complete",
    session: {
      access_token,
      refresh_code,
      expires_at: Date.now() + ACCESS_TTL_S * 1000,
      identity: { id: row.clerk_sub, email: row.email },
    },
  });
}

async function handleRevoke(refreshCode: string) {
  const hash = b64url(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(refreshCode)
  )));
  const row = await pairByRefreshHash(hash);
  if (row) await pairClearRefresh(row.code);
  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  try {
    switch (body.action) {
      case "claim": {
        const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
        if (!jwt) return json({ error: "unauthorized", message: "Sign in first" }, 401);
        return await handleClaim(String(body.code ?? ""), jwt);
      }
      case "exchange":
        return await handleExchange(String(body.code ?? ""));
      case "refresh":
        return await handleRefresh(String(body.refresh_code ?? ""));
      case "revoke":
        return await handleRevoke(String(body.refresh_code ?? ""));
      default:
        return json({ error: "bad_action" }, 400);
    }
  } catch (e) {
    console.error("desktop-auth:", e);
    const err = e as { status?: number; error?: string; message?: string };
    return json(
      { error: err.error ?? "internal_error", message: String(err.message ?? e) },
      err.status ?? 500
    );
  }
});
