// ============================================================================
// Noska Connector Gateway (extensibility platform, phase 1)
//
// Noska as MCP CLIENT to external services (Gmail, Google Calendar, ...).
// Business logic lives in _shared/connectors/gateway.ts — this file is a
// thin action router, same shape as the oauth function:
//
//   GET    /                     (public)  → metadata
//   GET    /connectors           (JWT)     → sanitized catalog
//   GET    /connections          (JWT)     → your connections (no tokens)
//   POST   /connect              (JWT)     → {connector, redirect_uri?} → authorize_url
//   GET    /callback             (public)  → OAuth redirect target; identity
//                                          comes from the encrypted state
//   DELETE /connections/:id      (JWT)     → revoke (invalidates tokens)
//   GET    /tools                (JWT)     → merged tools across connections
//   POST   /tools/call           (JWT)     → {connector, tool, arguments}
//
// Deploy: supabase functions deploy connector-gateway --no-verify-jwt
// ==========================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db as dbClient, SITE } from "../_shared/core/runtime.ts";
import { errors, PlatformError } from "../_shared/core/pure.ts";
import {
  listAvailableTools, listConnectors, listConnections,
  callTool, startConnect, handleCallback, revokeConnection,
  connectWithToken, testConnection, resolveConnector, connectorSlugFromState,
} from "../_shared/connectors/gateway.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function fail(err: unknown): Response {
  if (err instanceof PlatformError) {
    return json({ error: err.code.toLowerCase(), message: err.message, ...err.extra }, err.status);
  }
  console.error("[connector-gateway] unhandled:", err);
  return json({ error: "internal_error", message: "Unexpected server error" }, 500);
}

async function requireUserJwt(req: Request): Promise<string> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "").trim();
  if (!token) throw errors.authRequired("Missing Authorization bearer token.");

  // Web sessions are Clerk JWTs (template "supabase") whose sub is a raw
  // Clerk id — GoTrue's auth.getUser() rejects non-UUID subjects outright
  // ("sub claim must be a UUID"), so Clerk tokens are verified locally
  // against the Clerk JWKS instead. Desktop paired sessions carry real
  // GoTrue JWTs (UUID sub) and go through auth.getUser().
  const clerkUserId = await verifyClerkJwt(token);
  if (clerkUserId) return clerkUserId;

  const { data, error } = await dbClient().auth.getUser(token);
  if (error || !data?.user?.id) {
    // Surface the underlying GoTrue reason — it makes session problems
    // diagnosable from the settings UI (contains no secrets).
    console.error("[connector-gateway] auth.getUser failed:", error?.message);
    throw errors.authRequired(`Invalid or expired session${error?.message ? ` — ${error.message}` : ""}.`);
  }
  return data.user.id;
}

/* ─── Clerk JWT verification (web sessions) ───────────────────────────── */

const CLERK_ISSUERS = (Deno.env.get("CLERK_JWT_ISSUERS") ?? "https://clerk.noska.me,https://ruling-ladybird-3.clerk.accounts.dev")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

const JWKS_CACHE_TTL_MS = 60 * 60_000;
const jwksCache = new Map<string, { key: CryptoKey; expires: number }>();

interface JwtHeader { alg?: string; kid?: string }

/** Verify a Clerk RS256 JWT (signature via JWKS, issuer, expiry) and
 * return its sub (the raw Clerk user id, e.g. "user_2abc…"). Returns
 * null for anything that isn't a Clerk token so GoTrue auth stays the
 * fallback path for desktop sessions. */
async function verifyClerkJwt(token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header: JwtHeader;
  try {
    header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  const key = await getClerkVerificationKey(header.kid);
  if (!key) return null;

  const payloadB64 = parts[1];
  const signature = base64UrlToBytes(parts[2]);
  const signed = new TextEncoder().encode(`${parts[0]}.${payloadB64}`);
  let valid = false;
  try {
    valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
  } catch {
    return null;
  }
  if (!valid) return null;

  let claims: { iss?: string; sub?: string; exp?: number };
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
  } catch {
    return null;
  }
  const iss = String(claims.iss ?? "").replace(/\/$/, "");
  if (!CLERK_ISSUERS.includes(iss)) return null;
  if (!claims.sub || typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
  return String(claims.sub);
}

async function getClerkVerificationKey(kid: string): Promise<CryptoKey | null> {
  const cached = jwksCache.get(kid);
  if (cached && cached.expires > Date.now()) return cached.key;
  for (const issuer of CLERK_ISSUERS) {
    try {
      const res = await fetch(`${issuer}/.well-known/jwks.json`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) continue;
      const { keys } = await res.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
      const jwk = (keys ?? []).find((k) => k.kid === kid && k.alg === "RS256");
      if (!jwk) continue;
      const key = await crypto.subtle.importKey(
        "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
      );
      jwksCache.set(kid, { key, expires: Date.now() + JWKS_CACHE_TTL_MS });
      return key;
    } catch {
      // unreachable issuer — try the next one
    }
  }
  return null;
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Where providers must send users back after consent. Override with
 * CONNECTOR_OAUTH_REDIRECT_BASE for custom domains / preview URLs. */
function callbackBase(req: Request): string {
  const override = Deno.env.get("CONNECTOR_OAUTH_REDIRECT_BASE")?.replace(/\/$/, "");
  if (override) return `${override}/connector-gateway`;
  return `${new URL(req.url).origin}/functions/v1/connector-gateway`;
}

function appRedirect(status: "connected" | "error", connectorSlug: string, message?: string): Response {
  const url = new URL(`${SITE}/settings/connectors`);
  url.searchParams.set("connector", connectorSlug);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const action = url.pathname.replace(/\/connector-gateway\/?/, "").replace(/^\//, "");

  try {
    /* Metadata (public). */
    if (action === "" && req.method === "GET") {
      return json({
        name: "Noska Connector Gateway",
        protocol: "MCP client (JSON-RPC 2.0 over Streamable HTTP)",
        endpoints: {
          connectors: "/connector-gateway/connectors",
          connections: "/connector-gateway/connections",
          connect: "/connector-gateway/connect",
          "connect/manual": "/connector-gateway/connect/manual",
          callback: "/connector-gateway/callback",
          "connections/test": "/connector-gateway/connections/test",
          tools: "/connector-gateway/tools",
          call: "/connector-gateway/tools/call",
        },
      });
    }

    /* ── Authenticated surface (Clerk session via Supabase third-party auth) ── */

    if (action === "connectors" && req.method === "GET") {
      await requireUserJwt(req);
      return json(await listConnectors());
    }

    if (action === "connections" && req.method === "GET") {
      const userId = await requireUserJwt(req);
      return json(await listConnections(userId));
    }

    if (action === "connect" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "");
      if (!connectorRef) throw errors.validation("connector (id or slug) is required.");
      const connector = await resolveConnector(connectorRef);
      const redirectUri = typeof body.redirect_uri === "string" && body.redirect_uri
        ? body.redirect_uri
        : `${callbackBase(req)}/callback`;
      return json(await startConnect(userId, connector, redirectUri));
    }

    if (action === "connect/manual" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "custom-mcp");
      const token = String(body.token ?? body.api_key ?? "");
      if (!token) throw errors.validation("token is required.");
      const connector = await resolveConnector(connectorRef);
      return json(await connectWithToken(userId, connector, {
        token,
        label: typeof body.label === "string" ? body.label : undefined,
        serverUrl: typeof body.server_url === "string" ? body.server_url : undefined,
      }));
    }

    if (action === "connections/test" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectionId = String(body.connection_id ?? body.id ?? "");
      if (!connectionId) throw errors.validation("connection_id is required.");
      return json(await testConnection(userId, connectionId));
    }

    if (action.startsWith("connections/") && req.method === "DELETE") {
      const userId = await requireUserJwt(req);
      return json(await revokeConnection(userId, action.slice("connections/".length)));
    }

    if (action === "tools" && req.method === "GET") {
      const userId = await requireUserJwt(req);
      const connectorId = url.searchParams.get("connector_id") ?? url.searchParams.get("connector") ?? undefined;
      const force = url.searchParams.get("force") === "true" || url.searchParams.get("refresh") === "true";
      return json(await listAvailableTools(userId, { connectorId, force }));
    }

    if (action === "tools/call" && req.method === "POST") {
      const userId = await requireUserJwt(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const connectorRef = String(body.connector ?? body.connector_id ?? body.slug ?? "");
      const tool = String(body.tool ?? body.tool_name ?? "");
      if (!connectorRef) throw errors.validation("connector (id or slug) is required.");
      if (!tool) throw errors.validation("tool is required.");
      const args = (body.arguments ?? body.args ?? {}) as Record<string, unknown>;
      return json(await callTool(userId, connectorRef, tool, args));
    }

    /* ── Public OAuth callback: the encrypted state IS the identity ── */

    if (action === "callback" && req.method === "GET") {
      const state = url.searchParams.get("state") ?? undefined;
      const providerError = url.searchParams.get("error");
      if (providerError) {
        console.warn("[connector-gateway] provider returned error:", providerError);
        return appRedirect("error", await connectorSlugFromState(state),
          url.searchParams.get("error_description") ?? providerError);
      }
      try {
        const { connector } = await handleCallback({
          code: url.searchParams.get("code") ?? undefined,
          state,
        });
        return appRedirect("connected", String(connector.slug));
      } catch (err) {
        console.error("[connector-gateway] callback failed:", err);
        return appRedirect("error", await connectorSlugFromState(state),
          err instanceof Error ? err.message : "Connect failed.");
      }
    }

    return json({ error: "not_found", message: `Unknown action "${action}"` }, 404);
  } catch (err) {
    return fail(err);
  }
});
