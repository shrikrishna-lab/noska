// Desktop browser-pairing auth edge function — v5 (claim-parity).
//
// The web app authenticates to Supabase using a Clerk JWT-template token
// (template "supabase": HS256, project-secret-signed, RLS claims). Pairing
// reuses EXACTLY that token:
//
//  claim    (browser sends the template token): GoTrue verifies signature
//           + expiry; the function captures its claims verbatim and links
//           them to the code.
//  exchange (desktop): re-signs the SAME claims with a fresh iat/exp —
//           so RLS behaves identically to the web session.
//  refresh  (desktop, { sid }): re-issues from the stored Clerk session id.
//
// sid (Clerk session id) enables silent re-issue without the browser.

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
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET") ?? "";

const ACCESS_TTL_S = 3600;

async function rest(
  path: string,
  init: RequestInit & { key?: string } = {}
): Promise<Response> {
  const res = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      apikey: init.key ?? SERVICE_KEY,
      Authorization: `Bearer ${init.key ?? SERVICE_KEY}`,
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

/** GoTrue verifies the template token (signature + expiry) and we keep its claims. */
async function gotrueVerify(clerkJwt: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${clerkJwt}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw httpError(401, "unauthorized", `Verification failed (${res.status}): ${body.slice(0, 220)}`);
  }
  return decodeJwtPayload(clerkJwt);
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Re-signs the stored claims with a fresh iat/exp under the project secret. */
async function signClaims(claims: Record<string, unknown>): Promise<string> {
  if (!JWT_SECRET) throw httpError(500, "server_config", "JWT secret not configured");
  const { iat: _i, exp: _e, ...rest } = claims;
  const payload = { ...rest, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_S };
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
}

/* ── pairing rows ──────────────────────────────────────────────────────── */

interface PairRow {
  code: string;
  claims: Record<string, unknown> | null;
  status: string;
  attempts: number;
  expires_at: string;
}

async function pairUpsertClaimed(code: string, claims: Record<string, unknown>) {
  const res = await rest("/rest/v1/desktop_auth_pairs", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      code,
      claims,
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

async function handleClaim(code: string, templateJwt: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);
  const claims = await gotrueVerify(templateJwt);
  if (!claims?.sub) return json({ error: "unauthorized", message: "Malformed token" }, 401);
  await pairUpsertClaimed(code, claims);
  return json({ status: "claimed" });
}

async function handleRefresh(code: string) {
  const row = await pairFind(code);
  if (!row || !row.claims) return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ error: "invalid_refresh", message: "Sign in again" }, 401);
  }
  try {
    const access_token = await signClaims(row.claims);
    return json({
      status: "complete",
      session: { access_token, code, expires_at: Date.now() + ACCESS_TTL_S * 1000 },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "refresh_failed", message: err.message }, err.status ?? 500);
  }
}

async function handleExchange(code: string) {
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json({ status: "unknown_code" }, 400);
  const row = await pairFind(code);
  if (!row || row.status === "waiting" || !row.claims) return json({ status: "pending" });
  if (row.status === "used") return json({ status: "unknown_code" });
  if (new Date(row.expires_at).getTime() < Date.now()) return json({ status: "expired" });
  if (row.attempts >= 10) return json({ status: "expired" });

  try {
    const access_token = await signClaims(row.claims);
    // Keep the claims re-signable for 14 days (silent refresh).
    await rest(
      `/rest/v1/desktop_auth_pairs?code=eq.${encodeURIComponent(code)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "used",
          expires_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        }),
      }
    );
    return json({
      status: "complete",
      session: {
        access_token,
        claims: row.claims,
        expires_at: Date.now() + ACCESS_TTL_S * 1000,
      },
    });
  } catch (e) {
    const err = e as { status?: number; error?: string; message?: string };
    return json({ error: err.error ?? "exchange_failed", message: err.message }, err.status ?? 500);
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
      case "claim": {
        const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
        if (!jwt) return json({ error: "unauthorized", message: "Sign in first" }, 401);
        return await handleClaim(String(body.code ?? ""), jwt);
      }
      case "exchange":
        return await handleExchange(String(body.code ?? ""));
      case "refresh":
        return await handleRefresh(String(body.code ?? ""));
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
