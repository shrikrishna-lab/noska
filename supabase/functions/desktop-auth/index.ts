// Desktop browser-pairing auth edge function.
//
// POST /functions/v1/desktop-auth   body: { action, ... }
//
//  action:"claim"    (BROWSER, Clerk JWT in Authorization)
//      { code } -> verifies the Clerk session via GoTrue, links code->user.
//  action:"exchange" (DESKTOP, no session yet)
//      { code } -> if claimed: ensures an auth.users row exists for the
//                  mapped identity, mints a real GoTrue magic-link session
//                  server-side and returns it. The desktop then owns a
//                  first-class Supabase session; supabase-js refreshes it.
//  action:"revoke"   (DESKTOP) { refresh_token } -> admin sign-out.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const URL_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  user_id: string | null;
  email: string | null;
  status: string;
  attempts: number;
  expires_at: string;
}

async function pairUpsertClaimed(
  code: string,
  user_id: string,
  email: string | null
): Promise<void> {
  const res = await rest("/rest/v1/desktop_auth_pairs", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    key: SERVICE_KEY,
    body: JSON.stringify({
      code,
      user_id,
      email,
      status: "claimed",
      claimed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }),
  });
  if (!res.ok) throw new Error("pair_upsert_failed");
}

async function pairFind(code: string): Promise<PairRow | null> {
  const res = await rest(
    `/rest/v1/desktop_auth_pairs?code=${encodeURIComponent(code)}&select=*`,
    { key: SERVICE_KEY }
  );
  const rows = (await res.json()) as PairRow[];
  return rows[0] ?? null;
}

async function pairMarkUsed(code: string): Promise<void> {
  await rest(`/rest/v1/desktop_auth_pairs?code=${encodeURIComponent(code)}`, {
    method: "PATCH",
    key: SERVICE_KEY,
    body: JSON.stringify({ status: "used" }),
  });
}

async function pairBumpAttempts(code: string, n: number): Promise<void> {
  await rest(`/rest/v1/desktop_auth_pairs?code=${encodeURIComponent(code)}`, {
    method: "PATCH",
    key: SERVICE_KEY,
    body: JSON.stringify({ attempts: n }),
  });
}

/* ── identity helpers ──────────────────────────────────────────────────── */

/** Verifies a Clerk JWT through GoTrue and returns the mapped auth user. */
async function resolveClerkUser(clerkJwt: string): Promise<{ id: string; email: string | null }> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${clerkJwt}` },
  });
  if (!res.ok) throw httpError(401, "unauthorized", "Invalid or expired sign-in");
  const u = await res.json();
  if (!u?.id) throw httpError(401, "unauthorized", "Invalid or expired sign-in");
  return { id: u.id as string, email: (u.email as string) ?? null };
}

function httpError(status: number, error: string, message: string) {
  return { status, error, message };
}

/** Ensures a real auth.users row exists so GoTrue can mint sessions. */
async function ensureAuthUser(id: string, email: string | null): Promise<string> {
  const got = await rest(`/auth/v1/admin/users/${id}`);
  if (got.ok) {
    const u = await got.json();
    return (u.email as string) || email || `${id}@users.noska.app`;
  }
  const effectiveEmail = email || `${id}@users.noska.app`;
  const created = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      id,
      email: effectiveEmail,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(), // never used directly
    }),
  });
  if (!created.ok) throw httpError(500, "user_create_failed", "Could not link desktop identity");
  return effectiveEmail;
}

/** Mints a REAL GoTrue session server-side (no email is ever sent). */
async function mintSession(email: string) {
  const gl = await (await rest("/auth/v1/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email }),
  })).json();
  const tokenHash: string | undefined =
    gl?.hashed_token ??
    gl?.properties?.hashed_token ??
    (gl?.action_link ? new URL(gl.action_link).searchParams.get("token_hash") ?? undefined : undefined);
  if (!tokenHash) throw httpError(500, "link_failed", "Could not mint desktop session");

  const verify = await fetch(`${URL_BASE}/auth/v1/verify?type=magiclink`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
  });
  if (!verify.ok) throw httpError(500, "verify_failed", "Could not complete desktop session");
  const s = await verify.json();
  return {
    access_token: s.access_token as string,
    refresh_token: s.refresh_token as string,
    expires_in: (s.expires_in as number) ?? 3600,
  };
}

/* ── actions ───────────────────────────────────────────────────────────── */

async function handleClaim(code: string, clerkJwt: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) {
    return json({ status: "unknown_code" }, 400);
  }
  const user = await resolveClerkUser(clerkJwt);
  await pairUpsertClaimed(code, user.id, user.email);
  return json({ status: "claimed" });
}

async function handleExchange(code: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) {
    return json({ status: "unknown_code" }, 400);
  }
  const row = await pairFind(code);
  if (!row) return json({ status: "pending" });
  if (row.status === "waiting") return json({ status: "pending" });
  if (row.status === "used") return json({ status: "unknown_code" });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ status: "expired" });
  }
  if (row.attempts >= 10) return json({ status: "expired" });

  try {
    const email = await ensureAuthUser(row.user_id!, row.email);
    const session = await mintSession(email);
    await pairMarkUsed(code);
    return json({
      status: "complete",
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: Date.now() + session.expires_in * 1000,
        identity: { id: row.user_id!, email: row.email },
      },
    });
  } catch (e) {
    await pairBumpAttempts(code, row.attempts + 1);
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "exchange_failed", message: err.message }, err.status ?? 500);
  }
}

async function handleRevoke(refreshToken: string) {
  await rest("/auth/v1/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
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
      case "revoke":
        return await handleRevoke(String(body.refresh_token ?? ""));
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
