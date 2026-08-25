// Desktop browser-pairing auth edge function — v6 (Clerk session tokens).
//
// The web app authenticates to Supabase with CLERK session tokens
// (third-party auth), so rows are keyed by the raw Clerk user id. The
// desktop does the same: the pairing handoff stores the user's Clerk
// session id, and this function mints fresh Clerk session tokens
// (POST /v1/sessions/{sid}/tokens) whenever the desktop needs one.
//
//  claim    (browser, Clerk template JWT): GoTrue-verifies the token,
//           resolves the Clerk user + active session, links code → session.
//  exchange (desktop): mints a fresh Clerk session token for the linked
//           session and returns it with the user identity.
//  refresh  (desktop, { sid }): same, for the silent 60s-token refresh.
//
// NOTE: desktop and web share the SAME Clerk session. There is
// intentionally no remote "logout" — signing out on web invalidates the
// session for both.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // baggage/sentry-trace/traceparent: Sentry injects these into browser
  // fetches; without them the CORS preflight rejects the request.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, traceparent",
};

const URL_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? "";
const CLERK_API = "https://api.clerk.com/v1";

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

async function clerkActiveSessionId(sub: string): Promise<string | null> {
  if (!CLERK_SECRET_KEY) throw httpError(500, "server_config", "CLERK_SECRET_KEY not configured");
  const res = await fetch(`${CLERK_API}/users/${encodeURIComponent(sub)}/sessions`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  const sessions = (await res.json()) as Array<{ id: string; status: string }>;
  const active = sessions.find((s) => s.status === "active") ?? sessions[0];
  return active?.id ?? null;
}

async function clerkSessionToken(sid: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${CLERK_API}/sessions/${encodeURIComponent(sid)}/tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw httpError(401, "session_invalid", "Sign in again on the web");
  const j = await res.json();
  return { access_token: j.jwt as string, expires_in: 50 };
}

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

/** Registers a code as active (status=waiting) so the browser can claim it. */
async function pairInit(code: string) {
  const res = await rest("/rest/v1/desktop_auth_pairs", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      code,
      status: "waiting",
      claimed_at: null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) throw httpError(500, "pair_init_failed", "Could not start pairing");
}

async function handleClaim(code: string, clerkJwt: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);

  // The code must be REGISTERED by the desktop app (init) and still live.
  // Stale codes from old tabs/links are rejected with a clear reason.
  const existing = await pairFind(code);
  if (!existing) {
    return json({ error: "code_not_active", message: "This code isn't active. Open the Noska desktop app and use its current code." }, 400);
  }
  if (existing.status === "used") {
    return json({ error: "code_used", message: "This code was already used. Get the current code from the app." }, 400);
  }
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return json({ error: "code_expired", message: "This code expired. Click 'New code' in the app and retry." }, 400);
  }

  await gotrueVerify(clerkJwt);
  const payload = decodeJwtPayload(clerkJwt);
  const sub = typeof payload?.sub === "string" ? payload.sub : null;
  if (!sub) return json({ error: "unauthorized", message: "Malformed token" }, 401);

  const clerk = await clerkUserById(sub);
  if (!clerk) return json({ error: "unauthorized", message: "Clerk user not found" }, 401);
  const sid = await clerkActiveSessionId(sub);
  if (!sid) return json({ error: "unauthorized", message: "No active session" }, 401);

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

async function handleRefresh(sidOrCode: string) {
  // New clients send the Clerk session id (sess_…); the transitional
  // 1.0.3 client sends its pairing code — resolve either to a session.
  let sid = sidOrCode.startsWith("sess_") ? sidOrCode : "";
  if (!sid) {
    const row = await pairFind(sidOrCode);
    sid = row?.sid ?? "";
  }
  if (!sid) return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  try {
    const { access_token, expires_in } = await clerkSessionToken(sid);
    return json({
      status: "complete",
      session: { access_token, sid, expires_at: Date.now() + expires_in * 1000 },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "refresh_failed", message: err.message }, err.status ?? 500);
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
      case "init":
        return await (async () => {
          const code = String(body.code ?? "");
          if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ error: "bad_code" }, 400);
          await pairInit(code);
          return json({ status: "waiting" });
        })();
      case "claim": {
        const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
        if (!jwt) return json({ error: "unauthorized", message: "Sign in first" }, 401);
        return await handleClaim(String(body.code ?? ""), jwt);
      }
      case "exchange":
        return await handleExchange(String(body.code ?? ""));
      case "refresh":
        return await handleRefresh(String(body.sid ?? ""));
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
