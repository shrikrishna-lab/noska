// ============================================================================
// Noska Platform V5 — OAuth endpoint (authorization-code flow)
//
//   POST /authorize  (user JWT)  → consent approved → one-time code + redirect
//   POST /token      (public)    → code+PKCE/secret → access & refresh tokens
//   POST /refresh    (public)    → rotate tokens
//   POST /revoke     (user JWT)  → kill all tokens for one of your apps
//   GET  /           (public)    → metadata
//
// Business logic lives in _shared/capabilities/platform.ts (oauth section).
// Deploy: supabase functions deploy oauth --no-verify-jwt
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { errors, PlatformError, sha256Hex } from "../_shared/core/pure.ts";
import { oauth as oauthCap, db as dbClient } from "../_shared/capabilities/platform.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function fail(err: unknown): Response {
  if (err instanceof PlatformError) return json({ error: err.code.toLowerCase(), message: err.message }, err.status);
  console.error("[oauth] unhandled:", err);
  return json({ error: "internal_error", message: "Unexpected server error" }, 500);
}

async function requireUserJwt(req: Request): Promise<string> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
  if (!token) throw errors.authRequired("Missing Authorization bearer token.");
  const { data, error } = await dbClient().auth.getUser(token);
  if (error || !data?.user?.id) throw errors.authRequired("Invalid or expired session.");
  return data.user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const action = url.pathname.replace(/\/oauth\/?/, "").replace(/^\//, "") || "";

  try {
    /* Metadata (public). */
    if (action === "" && req.method === "GET") {
      return json({
        name: "Noska OAuth",
        flows: ["authorization_code", "refresh_token"],
        pkce: "S256 supported and recommended",
        endpoints: { authorize: "/oauth/authorize", token: "/oauth/token", refresh: "/oauth/refresh", revoke: "/oauth/revoke" },
      });
    }

    const body = req.method === "POST"
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : Object.fromEntries(url.searchParams.entries());

    /* Step 1 — consent approved by the logged-in user (JWT required). */
    if (action === "authorize") {
      const userId = await requireUserJwt(req);
      const clientId = String(body.client_id ?? "");
      const { data: app } = await dbClient().from("oauth_apps").select("*").eq("client_id", clientId).maybeSingle();
      if (!app) return json({ error: "invalid_client", message: "Unknown client_id." }, 401);

      const scopes = Array.isArray(body.scopes)
        ? body.scopes.map(String)
        : typeof body.scope === "string" ? body.scope.split(/[\s+]/).filter(Boolean) : [];
      if (!scopes.length) return json({ error: "invalid_scope", message: "At least one scope is required." }, 400);

      const state = typeof body.state === "string" ? body.state : "";
      const result = await oauthCap.buildAuthorization(
        app as Record<string, unknown>,
        userId,
        String(body.redirect_uri ?? ""),
        scopes,
        body.code_challenge ? String(body.code_challenge) : undefined,
        body.code_challenge_method ? String(body.code_challenge_method) : undefined,
      );
      const redirect = new URL(String(body.redirect_uri));
      redirect.searchParams.set("code", result.code);
      if (state) redirect.searchParams.set("state", state);
      return json({ redirect_to: redirect.toString(), expires_in: result.expires_in });
    }

    /* Step 2 — code exchange (public; secret or PKCE required). */
    if (action === "token") {
      const grantType = String(body.grant_type ?? "authorization_code");
      if (grantType !== "authorization_code") {
        return json({ error: "unsupported_grant_type", message: "Use /oauth/refresh for refresh_token grants." }, 400);
      }
      const tokens = await oauthCap.exchangeCode({
        clientId: String(body.client_id ?? ""),
        code: String(body.code ?? ""),
        redirectUri: String(body.redirect_uri ?? ""),
        clientSecret: body.client_secret ? String(body.client_secret) : undefined,
        codeVerifier: body.code_verifier ? String(body.code_verifier) : undefined,
      });
      return json(tokens);
    }

    if (action === "refresh") {
      const tokens = await oauthCap.refresh(String(body.refresh_token ?? ""));
      return json(tokens);
    }

    /* Revocation — requires either the user session or the app credentials. */
    if (action === "revoke") {
      let userId: string | null = null;
      try { userId = await requireUserJwt(req); } catch { /* fall through to app-credential revocation */ }
      if (userId) {
        const clientId = String(body.client_id ?? "");
        const { data: app } = await dbClient().from("oauth_apps").select("id").eq("client_id", clientId).eq("user_id", userId).maybeSingle();
        if (!app) return json({ error: "not_found", message: "App not found among your OAuth apps." }, 404);
        return json(await oauthCap.revokeTokens(userId, String((app as Record<string, unknown>).id)));
      }
      // Token-holder self-revocation: presenting a valid bearer kills it.
      const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
      if (!bearer.startsWith("noska_at_")) return json({ error: "unauthorized", message: "Provide a session or token." }, 401);
      const hash = await sha256Hex(bearer);
      const { data: tok } = await dbClient().from("oauth_tokens")
        .select("id,app_id,user_id").eq("access_token_hash", hash).maybeSingle();
      if (tok) {
        await dbClient().from("oauth_tokens").update({ revoked_at: new Date().toISOString() })
          .eq("id", (tok as Record<string, unknown>).id as string);
        return json({ revoked: true });
      }
      return json({ error: "unauthorized", message: "Token not recognized." }, 401);
    }

    return json({ error: "not_found", message: `Unknown action "${action}"` }, 404);
  } catch (err) {
    return fail(err);
  }
});
