/* ============================================================================
 * Noska Platform V5 — Capability runtime (Deno/Edge side).
 *
 * Wires the pure capability core to persistence:
 *   - one service-role client (owner scoping happens in EVERY query)
 *   - API key authentication shared by /api/v1 and MCP
 *   - the verification contract (mutation → persisted re-read → verified)
 *   - canonical event emission (event bus feed)
 *   - audit logging
 *
 * SECURITY: this client bypasses RLS by design. Every function here takes an
 * explicit owner id and applies `.eq(ownerCol, owner)` — never trust ids from
 * request input without an ownership check.
 * ========================================================================== */

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  PlatformError, errors, sha256Hex, requireScopeOf, keyHasScope,
  type Row,
} from "./pure.ts";

export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
export const SITE = (Deno.env.get("SITE_URL") ?? "https://app.noska.me").replace(/\/$/, "");
export const pageUrl = (id: string) => `${SITE}/my-workspace/${id}`;

let _db: ReturnType<typeof createClient> | null = null;
/** Lazily-constructed service client (single instance per isolate). */
export function db() {
  if (!_db) {
    _db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  }
  return _db;
}

/* Re-export the pure core so interface layers import from ONE place. */
export { errors, PlatformError, requireScopeOf, keyHasScope, sha256Hex };
export type { Row };

/* ─── API keys ─── */

export interface KeyRow {
  id: string;
  user_id: string;
  scopes: string[];
  default_workspace_id: string;
  read_only?: boolean;
  allowed_tools?: string[];
}

export async function authenticateKey(req: Request): Promise<KeyRow> {
  const raw = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith("nsk_")) throw errors.authRequired();
  const { data } = await db().from("user_api_keys").select("*").eq("key_hash", await sha256Hex(raw)).maybeSingle();
  const k = data as (Row & {
    revoked_at: string | null; expires_at: string | null;
    scopes: unknown; default_workspace_id?: string;
  }) | null;
  if (!k) throw new PlatformError(401, "AUTH_REQUIRED", "API key not recognized.");
  if (k.revoked_at) throw new PlatformError(401, "AUTH_REQUIRED", "This key has been revoked.");
  if (k.expires_at && new Date(k.expires_at).getTime() < Date.now()) {
    throw new PlatformError(401, "AUTH_REQUIRED", "This key has expired.");
  }
  return {
    id: k.id as string,
    user_id: k.user_id as string,
    scopes: Array.isArray(k.scopes) ? k.scopes.map(String) : [],
    default_workspace_id: typeof k.default_workspace_id === "string" ? k.default_workspace_id : "",
    read_only: k.read_only === true,
    allowed_tools: Array.isArray(k.allowed_tools) ? k.allowed_tools.map(String) : [],
  };
}

/** Fire-and-forget usage stamp; never blocks a response. */
export function touchKey(keyId: string): void {
  db().from("user_api_keys").update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId).then(undefined, () => {});
}

/* ─── Verification contract ──────────────────────────────────────────────
 * mutation → persisted-state re-read → verified:true/false. Never report
 * success without actual verification. */

export interface VerificationResult {
  status: "passed" | "failed";
  checks: Array<{ field: string; expected: unknown; actual: unknown; ok: boolean }>;
  actual?: Row;
}

export async function verifyPersisted(
  ownerId: string,
  table: string,
  id: string,
  expect: Row,
  ownerCol: "user_id" | "owner_id" = "user_id",
): Promise<VerificationResult> {
  const { data } = await db().from(table).select("*").eq(ownerCol, ownerId).eq("id", id).maybeSingle();
  const actual = (data as Row) ?? undefined;
  const checks = Object.entries(expect).map(([field, expected]) => ({
    field,
    expected,
    actual: actual?.[field],
    ok: JSON.stringify(actual?.[field]) === JSON.stringify(expected),
  }));
  return { status: checks.every((c) => c.ok) ? "passed" : "failed", checks, actual };
}

/** Verify membership of an item inside a jsonb array column (e.g. blocks). */
export async function verifyArrayItem(
  ownerId: string,
  table: string,
  rowId: string,
  arrayCol: string,
  itemPredicate: (item: Row) => boolean,
  ownerCol: "user_id" | "owner_id" = "user_id",
): Promise<boolean> {
  const { data } = await db().from(table).select(arrayCol).eq(ownerCol, ownerId).eq("id", rowId).maybeSingle();
  const items = ((data as Row | null)?.[arrayCol] ?? []) as Array<Row>;
  return items.some(itemPredicate);
}

/* ─── Event bus ─── */

export async function emitEvent(input: {
  userId: string;
  workspaceId?: string;
  type: string;
  entity?: string;
  entityId?: string;
  actor?: string;
  data?: Row;
  requestId?: string;
}): Promise<void> {
  // Best-effort: the event bus must never fail a live mutation.
  try {
    await db().from("noska_events").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? "",
      type: input.type,
      entity: input.entity ?? "",
      entity_id: input.entityId ?? "",
      actor: input.actor ?? "system",
      data: input.data ?? {},
      request_id: input.requestId ?? null,
    });
  } catch (err) {
    console.error("[events] emit failed:", err);
  }
}

/* ─── Audit log ─── */

export async function audit(input: {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  surface?: "api" | "mcp" | "agent" | "automation" | "plugin" | "webhook" | "oauth";
  apiKeyId?: string;
  requestId?: string;
  metadata?: Row;
}): Promise<void> {
  try {
    await db().from("developer_audit_log").insert({
      user_id: input.userId,
      action: input.action,
      resource: input.resource ?? "",
      resource_id: input.resourceId ?? "",
      surface: input.surface ?? "api",
      api_key_id: input.apiKeyId ?? null,
      request_id: input.requestId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[audit] write failed:", err);
  }
}

/* ─── Secret encryption (AES-GCM; mirrors the agent BYOK scheme) ────
 * Webhook signing secrets are stored encrypted with a server-side key so
 * the dispatcher can sign deliveries while no raw secret is ever readable
 * from the database alone or exposed to any client. */

const SECRET_ENCRYPTION_KEY =
  Deno.env.get("WEBHOOK_ENCRYPTION_KEY") ?? Deno.env.get("AGENT_ENCRYPTION_KEY") ?? "";

async function deriveSecretKey(): Promise<CryptoKey> {
  if (!SECRET_ENCRYPTION_KEY) throw errors.internal("WEBHOOK_ENCRYPTION_KEY is not configured");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SECRET_ENCRYPTION_KEY));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await deriveSecretKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const bytes = new Uint8Array(iv.length + ct.byteLength);
  bytes.set(iv); bytes.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...bytes));
}

export async function decryptSecret(blob: string): Promise<string> {
  const key = await deriveSecretKey();
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", key }, key, bytes.slice(12))
    .catch(() => { throw errors.internal("Stored secret could not be decrypted — check WEBHOOK_ENCRYPTION_KEY"); });
  return new TextDecoder().decode(pt);
}

/* ─── Owner-scoped loaders ─── */

export async function loadOwned(
  table: string,
  ownerId: string,
  id: string,
  ownerCol: "user_id" | "owner_id" = "user_id",
): Promise<Row> {
  const { data, error } = await db().from(table).select("*").eq(ownerCol, ownerId).eq("id", id).maybeSingle();
  if (error) throw errors.internal(error.message);
  if (!data) throw errors.notFound(table.replace(/_/g, " "));
  return data as Row;
}
