/* Noska MCP V5 — shared infrastructure shim.
 *
 * Since V5, ALL capability primitives live in /_shared (the canonical Noska
 * Capability Layer used by the API, MCP, agents and automations alike).
 * This module preserves the historical import surface of the MCP server so
 * the V4 tool registry keeps working unchanged while delegating every
 * primitive to the shared implementation. No business logic lives here. */
import {
  authenticateKey,
  db as dbClient,
  verifyPersisted,
  SITE, pageUrl,
} from "../_shared/core/runtime.ts";
import {
  PlatformError as PurePlatformError,
  extractId, mustId, sha256Hex, keyHasScope,
  blocksToMarkdown, markdownToBlocks,
  COMMANDS, commandByName,
  initialReviewState,
} from "../_shared/core/pure.ts";
import { classifyAuth } from "./protocol.ts";

/* Service-role client (owner scoping happens in every query — see runtime.ts). */
export const db = dbClient();

export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
export { SITE, pageUrl };

/* ─── Errors (standardised model, historical names preserved) ─── */
export class McpError extends PurePlatformError {}
export const E = {
  authRequired: () => new McpError(401, "AUTH_REQUIRED", "Missing or invalid API key."),
  forbidden: (m = "Key lacks the required scope.") => new McpError(403, "FORBIDDEN", m),
  notFound: (what: string) => new McpError(404, "NOT_FOUND", `${what} was not found in your workspace.`),
  invalidId: (f: string) => new McpError(400, "INVALID_ID", `Could not resolve an entity id from ${f}.`),
  validation: (m: string) => new McpError(400, "VALIDATION_ERROR", m),
  unsupported: (m: string) => new McpError(501, "UNSUPPORTED_CAPABILITY", m),
};

/* ─── Auth ─── */
export interface KeyRow {
  id: string;
  user_id: string;
  scopes: string[];
  default_workspace_id: string;
  read_only?: boolean;
  allowed_tools?: string[];
  /** "apikey" | "oauth" | "query" — how this request authenticated. */
  via?: string;
}

export async function authenticate(req: Request): Promise<KeyRow> {
  // 1) Preferred: Authorization: Bearer nsk_… (API key)
  // 2) OAuth: Authorization: Bearer noska_at_… (ChatGPT/Claude connectors,
  //    third-party agents via the /oauth authorization-code flow).
  // 3) Fallback for header-less clients (ChatGPT custom connectors, some
  //    agent runtimes): the key may arrive as ?key= / ?api_key= on the URL.
  //    One-link connection, Notion/Supabase style — opt-in, revocable.
  //    The header ALWAYS wins over the query string (see classifyAuth), so
  //    a leaked link can never override a real credential. ?key= URLs are
  //    never logged by this function.
  const url = new URL(req.url);
  const auth = classifyAuth(
    req.headers.get("Authorization"),
    url.searchParams.get("key") ?? url.searchParams.get("api_key"),
  );

  if (auth.kind === "apikey") {
    const key = await authenticateKey(req).catch(() => null);
    if (key) return { ...(key as KeyRow), via: "apikey" };
  }

  // OAuth bearer (noska_at_…) — resolved against oauth_tokens.
  if (auth.kind === "oauth") {
    try {
      const { oauth } = await import("../_shared/capabilities/platform.ts");
      const principal = await oauth.authenticateOAuthToken(req);
      return { ...(principal as unknown as KeyRow), via: "oauth" };
    } catch {
      // fall through to 401
    }
  }

  if (auth.kind === "query") {
    const { data } = await dbClient().from("user_api_keys")
      .select("id,user_id,scopes,default_workspace_id,read_only,allowed_tools,revoked_at,expires_at").eq("key_hash", await sha256Hex(auth.raw)).maybeSingle();
    const k = data as (Row & {
      revoked_at: string | null; expires_at: string | null;
      scopes: unknown; default_workspace_id?: string;
      read_only?: boolean; allowed_tools?: unknown;
    }) | null;
    if (k && !k.revoked_at && !(k.expires_at && new Date(k.expires_at).getTime() < Date.now())) {
      return {
        id: k.id as string, user_id: k.user_id as string,
        scopes: Array.isArray(k.scopes) ? k.scopes.map(String) : [],
        default_workspace_id: typeof k.default_workspace_id === "string" ? k.default_workspace_id : "",
        read_only: k.read_only === true,
        allowed_tools: Array.isArray(k.allowed_tools) ? (k.allowed_tools as unknown[]).map(String) : [],
        via: "query",
      };
    }
  }
  throw E.authRequired();
}

export function requireScope(key: KeyRow, scope: string) {
  // Alias-aware (learning:* ≡ reviews:*) — same rule as REST + policy engine.
  if (!keyHasScope(key.scopes ?? [], scope)) throw E.forbidden(`Requires "${scope}".`);
  return key;
}

/* ─── Shared resolvers (canonical implementations) ─── */
export { extractId, mustId };

type Row = Record<string, unknown>;
export type { Row };

export async function loadPage(userId: string, ref: unknown): Promise<Row> {
  const { loadPage } = await import("../_shared/capabilities/content.ts");
  return loadPage(userId, ref);
}

/** Re-read after mutation and assert expected state (verification contract).
 * ownerCol: pages use "user_id"; agents/automations use "owner_id". */
export async function verify(
  userId: string,
  table: string,
  id: string,
  expect: Row,
  ownerCol: "user_id" | "owner_id" = "user_id",
) {
  return verifyPersisted(userId, table, id, expect, ownerCol);
}

/* ─── Markdown ↔ native blocks & command registry (canonical) ─── */
export { blocksToMarkdown, markdownToBlocks, COMMANDS, commandByName, initialReviewState };