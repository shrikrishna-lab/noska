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
  extractId, mustId, sha256Hex,
  blocksToMarkdown, markdownToBlocks,
  COMMANDS, commandByName,
  initialReviewState,
} from "../_shared/core/pure.ts";

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
}

export async function authenticate(req: Request): Promise<KeyRow> {
  // Preferred: Authorization: Bearer nsk_…
  // Fallback for header-less clients (ChatGPT connectors, some agent
  // runtimes): the key may arrive as ?key= / ?api_key= on the endpoint URL.
  // One-link connection, Notion/Supabase style — opt-in, revocable, and
  // never logged by this function.
  let key = await authenticateKey(req).catch(() => null);
  // OAuth bearer tokens (noska_at_...) issued via the MCP authorization flow
  if (!key) {
    const raw = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (raw.startsWith("noska_at_")) {
      try {
        const { authenticateOAuthToken } = await import("../_shared/capabilities/platform.ts");
        const principal = await authenticateOAuthToken(req);
        key = {
          id: principal.id, user_id: principal.user_id, scopes: principal.scopes,
          default_workspace_id: "", read_only: false, allowed_tools: [],
        };
      } catch { /* fall through to ?key= / AUTH_REQUIRED */ }
    }
  }
  if (!key) {
    const url = new URL(req.url);
    const raw = (url.searchParams.get("key") ?? url.searchParams.get("api_key") ?? "").trim();
    if (raw.startsWith("nsk_")) {
      const { data } = await dbClient().from("user_api_keys")
        .select("*").eq("key_hash", await sha256Hex(raw)).maybeSingle();
      const k = data as (Row & {
        revoked_at: string | null; expires_at: string | null;
        scopes: unknown; default_workspace_id?: string;
      }) | null;
      if (k && !k.revoked_at && !(k.expires_at && new Date(k.expires_at).getTime() < Date.now())) {
        key = {
          id: k.id as string, user_id: k.user_id as string,
          scopes: Array.isArray(k.scopes) ? k.scopes.map(String) : [],
          default_workspace_id: typeof k.default_workspace_id === "string" ? k.default_workspace_id : "",
          read_only: k.read_only === true,
          allowed_tools: Array.isArray(k.allowed_tools) ? k.allowed_tools.map(String) : [],
        };
      }
    }
  }
  if (!key) throw E.authRequired();
  return key;
}

export function requireScope(key: KeyRow, scope: string) {
  if (!key.scopes.includes(scope)) throw E.forbidden(`Requires "${scope}".`);
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