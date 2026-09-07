// Desktop browser-pairing auth edge function — v5 (Clerk session tokens).
//
// The web app authenticates to Supabase with CLERK session tokens
// (third-party auth), so rows are keyed by the raw Clerk user id. The
// desktop does the same: the auth handoff stores the user's Clerk
// session id, and this function mints fresh Clerk session tokens
// (POST /v1/sessions/{sid}/tokens) whenever the desktop needs one.
//
// ── Browser handoff (primary desktop flow — noska://auth/callback) ──────
//   start    (desktop): registers a transaction with a PKCE code
//            challenge. Returns only the transaction id.
//   attach   (browser, Clerk JWT): the signed-in web completion page links
//            its Clerk identity to the transaction. The browser never
//            sees the PKCE verifier and the URL never carries tokens.
//   consume  (desktop, { transaction_id, code_verifier }): proves the
//            caller is the app that started the transaction (SHA-256
//            verifier must match the stored challenge), then mints a
//            session. Single-use, short-lived, rate-limited by attempts.
//   cancel   (desktop): invalidates a pending transaction.
//   refresh  (desktop, { sid, refresh_secret }): mints a fresh token.
//            Sessions created via `consume` MUST present the
//            refresh_secret issued at consume time; legacy pairing
//            sessions (desktop_auth_pairs) keep the sid-only path.
//
// ── Legacy pairing code flow (still supported) ──────────────────────────
//   claim    (browser, Clerk JWT): GoTrue-verifies the token, decodes
//            sub + sid, cross-checks against the Clerk Backend API, links
//            code → session.
//   exchange (desktop): mints a fresh Clerk session token for the linked
//            session and returns it with the user identity.
//
// NOTE: desktop and web share the SAME Clerk session. There is
// intentionally no remote "logout" — signing out on web invalidates the
// session for both.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // baggage + sentry-trace: the Sentry SDK instruments window.fetch on
  // noska.me and attaches these to cross-origin calls; without allowing
  // them, the CORS preflight rejects EVERY browser request.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, traceparent",
};

const URL_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? "";
const CLERK_API = "https://api.clerk.com/v1";

const TXN_TTL_MS = 10 * 60 * 1000;
const TXN_MAX_ATTEMPTS = 10;
const TXN_MAX_OPEN = 100;

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function httpError(status: number, error: string, message: string) {
  return { status, error, message };
}

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

/** GoTrue verifies the Clerk JWT — proves Supabase's third-party auth trusts it. */
async function gotrueVerify(clerkJwt: string): Promise<void> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${clerkJwt}` },
  });
  if (!res.ok) throw httpError(401, "unauthorized", "Invalid or expired sign-in");
}

/** Clerk Backend API cross-check: sub must be a real Clerk user. */
async function clerkUserById(sub: string): Promise<{ email: string | null; name: string | null } | null> {
  if (!CLERK_SECRET_KEY) throw httpError(500, "server_config", "CLERK_SECRET_KEY not configured");
  const res = await fetch(`${CLERK_API}/users/${encodeURIComponent(sub)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  const u = await res.json();
  const primary = u?.email_addresses?.find((e: { id: string }) => e.id === u?.primary_email_address_id)
    ?? u?.email_addresses?.[0];
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || null;
  return { email: primary?.email_address ?? null, name };
}

/** Clerk Backend API session lookup — verifies a client-supplied session id. */
async function clerkSessionActive(sid: string, sub: string): Promise<boolean> {
  if (!CLERK_SECRET_KEY) throw httpError(500, "server_config", "CLERK_SECRET_KEY not configured");
  const res = await fetch(`${CLERK_API}/sessions/${encodeURIComponent(sid)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) return false;
  const s = await res.json();
  return s?.status === "active" && s?.user_id === sub;
}

/**
 * Issues a REAL Supabase auth session for the mapped Supabase user.
 * Clerk is only the login method — Supabase issues the session, so
 * refresh, RLS (auth.uid() = Supabase UUID) and all client flows are
 * first-class. Clerk's own tokens are never sent to Supabase.
 */
async function supabaseSessionForClerkUser(clerkSub: string): Promise<{
  access_token: string; refresh_token: string; expires_at: number; supabase_uid: string; email: string | null;
}> {
  // 1. Resolve the Supabase user via the Clerk user's external_id mapping.
  const clerk = await clerkUserById(clerkSub);
  if (!clerk) throw httpError(401, "unauthorized", "Clerk user not found");
  const extRes = await fetch(`${CLERK_API}/users/${encodeURIComponent(clerkSub)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!extRes.ok) throw httpError(401, "unauthorized", "Clerk user not found");
  const extUser = await extRes.json();
  const supabaseUid = extUser?.external_id as string | undefined;
  if (!supabaseUid || !/^[0-9a-f-]{36}$/i.test(supabaseUid)) {
    throw httpError(403, "no_mapping", "This account has no linked Supabase identity. Contact support.");
  }

  // 2. Start a magic-link flow for that user and verify it — yields a real session.
  const linkRes = await rest("/auth/v1/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email: clerk.email }),
  });
  if (!linkRes.ok) throw httpError(500, "link_failed", "Could not start session exchange");
  const link = await linkRes.json();
  if (link?.user?.id !== supabaseUid) throw httpError(500, "mapping_mismatch", "Identity mapping mismatch");

  const verifyRes = await fetch(`${URL_BASE}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.properties?.hashed_token }),
  });
  if (!verifyRes.ok) throw httpError(500, "verify_failed", "Could not complete session exchange");
  const session = await verifyRes.json();
  if (!session?.access_token || !session?.refresh_token) {
    throw httpError(500, "session_failed", "Could not complete session exchange");
  }
  const expiresIn = typeof session.expires_in === "number" ? session.expires_in : 3600;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + expiresIn * 1000,
    supabase_uid: session.user?.id ?? supabaseUid,
    email: session.user?.email ?? clerk.email,
  };
}

/* ── browser handoff transactions ──────────────────────────────────────── */

interface TxnRow {
  transaction_id: string;
  code_challenge: string;
  refresh_secret: string | null;
  status: string;
  clerk_sub: string | null;
  sid: string | null;
  email: string | null;
  attempts: number;
  expires_at: string;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PKCE S256: base64url(SHA-256(verifier)) must equal the stored challenge. */
async function pkceMatches(challenge: string, verifier: string): Promise<boolean> {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let b64 = "";
  for (const b of bytes) b64 += String.fromCharCode(b);
  const encoded = btoa(b64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return encoded === challenge;
}

async function txnPruneExpired() {
  await rest(
    `/rest/v1/desktop_auth_transactions?expires_at=lt.${new Date().toISOString()}`,
    { method: "DELETE" }
  );
}

async function txnOpenCount(): Promise<number> {
  const res = await rest(
    `/rest/v1/desktop_auth_transactions?status=in.(pending,attached)&select=transaction_id`
  );
  if (!res.ok) return 0;
  return ((await res.json()) as unknown[]).length;
}

async function txnFind(id: string): Promise<TxnRow | null> {
  const res = await rest(
    `/rest/v1/desktop_auth_transactions?transaction_id=eq.${encodeURIComponent(id)}&select=*`
  );
  const rows = (await res.json()) as TxnRow[];
  return rows[0] ?? null;
}

async function txnInsert(codeChallenge: string): Promise<TxnRow | null> {
  const res = await rest("/rest/v1/desktop_auth_transactions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      transaction_id: randomHex(16),
      code_challenge: codeChallenge,
      expires_at: new Date(Date.now() + TXN_TTL_MS).toISOString(),
    }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as TxnRow[];
  return rows[0] ?? null;
}

async function txnAttach(id: string, sub: string, sid: string, email: string | null): Promise<boolean> {
  // Conditional update: only a still-pending transaction can be attached,
  // so a duplicate attach or a race against consume is a no-op.
  const res = await rest(
    `/rest/v1/desktop_auth_transactions?transaction_id=eq.${encodeURIComponent(id)}&status=eq.pending&expires_at=gte.${new Date().toISOString()}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "attached",
        clerk_sub: sub,
        sid,
        email,
        attached_at: new Date().toISOString(),
      }),
    }
  );
  if (!res.ok) return false;
  return ((await res.json()) as unknown[]).length === 1;
}

async function txnConsume(id: string, refreshSecret: string): Promise<void> {
  await rest(
    `/rest/v1/desktop_auth_transactions?transaction_id=eq.${encodeURIComponent(id)}&status=eq.attached`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "consumed",
        refresh_secret: refreshSecret,
        consumed_at: new Date().toISOString(),
      }),
    }
  );
}

async function txnCancel(id: string): Promise<void> {
  await rest(
    `/rest/v1/desktop_auth_transactions?transaction_id=eq.${encodeURIComponent(id)}&status=in.(pending,attached)`,
    { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
  );
}

async function txnBumpAttempts(id: string, current: number): Promise<void> {
  await rest(
    `/rest/v1/desktop_auth_transactions?transaction_id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ attempts: current + 1 }) }
  );
}

/* ── pairing rows ──────────────────────────────────────────────────────── */

interface PairRow {
  code: string;
  sid: string | null;
  clerk_sub: string | null;
  email: string | null;
  status: string;
  attempts: number;
  expires_at: string;
}

async function pairUpsertClaimed(code: string, sid: string, sub: string, email: string | null) {
  const res = await rest("/rest/v1/desktop_auth_pairs", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      code,
      sid,
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

async function pairMarkUsed(code: string) {
  await rest(`/rest/v1/desktop_auth_pairs?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "used" }),
  });
}

/* ── actions ───────────────────────────────────────────────────────────── */

async function handleClaim(code: string, clerkJwt: string, sidFromBody: string | null) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);

  await gotrueVerify(clerkJwt);
  const payload = decodeJwtPayload(clerkJwt);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) return json({ error: "unauthorized", message: "Malformed token" }, 401);

  let sid = sidFromBody ?? null;
  if (sid) {
    if (!/^[a-zA-Z0-9_]{8,64}$/.test(sid)) return json({ error: "unauthorized", message: "Malformed session" }, 401);
    if (!(await clerkSessionActive(sid, sub))) {
      return json({ error: "unauthorized", message: "Clerk session is not active for this user" }, 401);
    }
  } else {
    sid = typeof payload?.sid === "string" ? payload.sid : null;
    if (!sid) return json({ error: "unauthorized", message: "No active Clerk session" }, 401);
  }

  const clerk = await clerkUserById(sub);
  if (!clerk) return json({ error: "unauthorized", message: "Clerk user not found" }, 401);

  await pairUpsertClaimed(code, sid, sub, clerk.email);
  return json({ status: "claimed", name: clerk.name });
}

async function handleExchange(code: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);
  const row = await pairFind(code);
  if (!row || row.status === "waiting" || !row.sid) return json({ status: "pending" });
  if (row.status === "used") return json({ status: "unknown_code" });
  if (new Date(row.expires_at).getTime() < Date.now()) return json({ status: "expired" });
  if (row.attempts >= 10) return json({ status: "expired" });

  try {
    const { access_token, expires_in } = await clerkSessionToken(row.sid);
    await pairMarkUsed(code);
    return json({
      status: "complete",
      session: {
        access_token,
        sid: row.sid,
        expires_at: Date.now() + expires_in * 1000,
        identity: { id: row.clerk_sub, email: row.email },
      },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "exchange_failed", message: err.message }, err.status ?? 500);
  }
}

async function handleRefresh(sid: string, refreshSecret: string | null, pairingCode: string) {
  if (!sid) return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  if (!/^[0-9a-f-]{36}$/i.test(sid)) {
    // Legacy Clerk-sid sessions are gone — re-auth required.
    return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  }
  // sid is now the Supabase user id (post-QuickLink sessions).
  const uid = sid;
  const userRes = await rest("/auth/v1/admin/users/" + uid, { method: "GET" });
  if (!userRes.ok) return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  const u = await userRes.json();
  try {
    const linkRes = await rest("/auth/v1/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email: u.email }),
    });
    if (!linkRes.ok) throw httpError(500, "link_failed", "Could not refresh session");
    const link = await linkRes.json();
    const verifyRes = await fetch(`${URL_BASE}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.properties?.hashed_token }),
    });
    if (!verifyRes.ok) throw httpError(500, "verify_failed", "Could not refresh session");
    const session = await verifyRes.json();
    return json({
      status: "complete",
      session: {
        access_token: session.access_token,
        sid: uid,
        expires_at: Date.now() + (typeof session.expires_in === "number" ? session.expires_in : 3600) * 1000,
        refresh_token: session.refresh_token,
      },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "refresh_failed", message: err.message }, err.status ?? 500);
  }
}

/* ── browser handoff actions ───────────────────────────────────────────── */

async function handleStart(codeChallenge: string) {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) {
    return json({ error: "invalid_challenge", message: "Malformed PKCE challenge" }, 400);
  }
  await txnPruneExpired();
  if ((await txnOpenCount()) >= TXN_MAX_OPEN) {
    return json({ error: "too_many_requests", message: "Too many sign-ins in progress — try again shortly" }, 429);
  }
  const row = await txnInsert(codeChallenge);
  if (!row) return json({ error: "start_failed", message: "Could not start sign-in" }, 500);
  return json({ status: "started", transaction_id: row.transaction_id, expires_at: row.expires_at });
}

async function handleAttach(transactionId: string, clerkJwt: string, sidFromBody: string | null) {
  if (!/^[a-f0-9]{32}$/.test(transactionId)) return json({ status: "unknown_transaction" }, 400);

  // The Authorization token is the "supabase" JWT template — GoTrue-verifiable
  // (ES256 signing key) but it carries no sid claim, so the session id comes
  // from the body and is verified against the Clerk Backend API.
  await gotrueVerify(clerkJwt);
  const payload = decodeJwtPayload(clerkJwt);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) return json({ error: "unauthorized", message: "Malformed token" }, 401);

  let sid = sidFromBody ?? null;
  if (sid) {
    if (!/^[a-zA-Z0-9_]{8,64}$/.test(sid)) return json({ error: "unauthorized", message: "Malformed session" }, 401);
    if (!(await clerkSessionActive(sid, sub))) {
      return json({ error: "unauthorized", message: "Clerk session is not active for this user" }, 401);
    }
  } else {
    // Legacy clients send the default session token, which embeds the sid.
    sid = typeof payload?.sid === "string" ? payload.sid : null;
    if (!sid) return json({ error: "unauthorized", message: "No active Clerk session" }, 401);
  }

  const clerk = await clerkUserById(sub);
  if (!clerk) return json({ error: "unauthorized", message: "Clerk user not found" }, 401);

  const attached = await txnAttach(transactionId, sub, sid, clerk.email);
  if (!attached) return json({ status: "unknown_transaction" }, 404);
  return json({ status: "attached", name: clerk.name });
}

async function handleConsume(transactionId: string, verifier: string) {
  if (!/^[a-f0-9]{32}$/.test(transactionId)) return json({ status: "unknown_transaction" }, 400);
  const row = await txnFind(transactionId);
  if (!row || row.status === "pending" || row.status === "cancelled") {
    return json({ status: "pending" });
  }
  if (row.status === "consumed") return json({ status: "unknown_transaction" });
  if (new Date(row.expires_at).getTime() < Date.now()) return json({ status: "expired" });
  if (row.attempts >= TXN_MAX_ATTEMPTS) return json({ status: "expired" });

  if (!(await pkceMatches(row.code_challenge, verifier))) {
    await txnBumpAttempts(transactionId, row.attempts);
    return json({ error: "invalid_verifier", message: "Sign-in could not be verified" }, 401);
  }

  if (!row.sid) return json({ status: "pending" });
  if (!row.clerk_sub) return json({ status: "pending" });
  try {
    const sess = await supabaseSessionForClerkUser(row.clerk_sub);
    await txnConsume(transactionId);
    return json({
      status: "complete",
      session: {
        access_token: sess.access_token,
        sid: sess.supabase_uid,
        expires_at: sess.expires_at,
        refresh_token: sess.refresh_token,
        identity: { id: sess.supabase_uid, email: sess.email },
      },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "consume_failed", message: err.message }, err.status ?? 500);
  }
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
      case "start":
        return await handleStart(String(body.code_challenge ?? ""));
      case "attach": {
        const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
        if (!jwt) return json({ error: "unauthorized", message: "Sign in first" }, 401);
        return await handleAttach(
          String(body.transaction_id ?? ""),
          jwt,
          body.sid ? String(body.sid) : null
        );
      }
      case "consume":
        return await handleConsume(String(body.transaction_id ?? ""), String(body.code_verifier ?? ""));
      case "cancel":
        await txnCancel(String(body.transaction_id ?? ""));
        return json({ status: "cancelled" });
      case "init":
        // ≤1.0.6 clients (re-)register their pairing code every poll cycle.
        // Claim works without registration on this version, so accept and
        // acknowledge to keep the old poll loop quiet.
        if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(String(body.code ?? ""))) {
          return json({ error: "bad_code" }, 400);
        }
        return json({ status: "waiting" });
      case "claim": {
        const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
        if (!jwt) return json({ error: "unauthorized", message: "Sign in first" }, 401);
        return await handleClaim(
          String(body.code ?? ""),
          jwt,
          body.sid ? String(body.sid) : null
        );
      }
      case "exchange":
        return await handleExchange(String(body.code ?? ""));
      case "refresh":
        return await handleRefresh(
          String(body.sid ?? ""),
          body.refresh_secret ? String(body.refresh_secret) : null,
          String(body.code ?? "")
        );
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
