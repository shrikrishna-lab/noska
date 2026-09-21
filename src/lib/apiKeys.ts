/* ─── API key management service ───
 *
 * Keys live in the `api_keys` table (owner-scoped RLS). The raw key is
 * generated here in the browser, shown exactly once, and only its
 * SHA-256 hash ever leaves the device — the database can never leak a
 * usable credential.
 */

import { supabase } from "./supabase";

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  read_only?: boolean;
  allowed_tools?: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_PREFIX = "nsk_";
const KEY_BODY_LEN = 32; // 32 chars × ~5.95 bits ≈ 190 bits of entropy
const MAX_NAME_LEN = 80;
const MAX_EXPIRY_DAYS = 365;

/** Canonical scope vocabulary (mirrors apiContract + edge pure.ts). */
export const API_SCOPES = [
  "pages:read",
  "pages:write",
  "databases:read",
  "databases:write",
  "tasks:read",
  "tasks:write",
  "reviews:read",
  "reviews:write",
  "search:read",
  "workspaces:read",
  "workspaces:write",
  "templates:read",
  "templates:write",
  "dashboards:read",
  "dashboards:write",
  "events:read",
  "agents:read",
  "agents:write",
  "agents:run",
  "automations:read",
  "automations:write",
  "automations:run",
  "webhooks:manage",
  "connections:manage",
  "intelligence:execute",
] as const;

const SCOPE_ALIASES: Record<string, string> = {
  "learning:read": "reviews:read",
  "learning:write": "reviews:write",
};

export function normalizeScope(scope: string): string {
  return SCOPE_ALIASES[scope] ?? scope;
}

export function normalizeScopes(scopes: string[]): string[] {
  return [...new Set(scopes.map((s) => normalizeScope(s.trim())).filter(Boolean))];
}

export function isValidScope(scope: string): boolean {
  return (API_SCOPES as readonly string[]).includes(normalizeScope(scope));
}

/** True for a well-formed raw Noska key (`nsk_` + base62). */
export function isNoskaKeyFormat(raw: string): boolean {
  return /^nsk_[A-Za-z0-9_-]{16,64}$/.test(raw.trim());
}

/** Cryptographically random key with rejection sampling (no modulo bias). */
function generateRawKey(): { raw: string; prefix: string } {
  const chars: string[] = [];
  while (chars.length < KEY_BODY_LEN) {
    const bytes = new Uint8Array(KEY_BODY_LEN - chars.length);
    crypto.getRandomValues(bytes);
    // 62 * 4 = 248 — accept bytes < 248 so `b % 62` is unbiased.
    for (const b of bytes) {
      if (b < 248) {
        chars.push(BASE62[b % BASE62.length]);
        if (chars.length >= KEY_BODY_LEN) break;
      }
    }
  }
  const raw = `${KEY_PREFIX}${chars.join("")}`;
  return { raw, prefix: raw.slice(0, 12) };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listApiKeys(userId: string, opts: { includeRevoked?: boolean; limit?: number } = {}): Promise<ApiKeyRecord[]> {
  if (!userId) throw new Error("Sign in to manage API keys.");
  let query = (supabase
    .from("user_api_keys" as any)
    .select("id,user_id,name,prefix,scopes,read_only,allowed_tools,created_at,expires_at,last_used_at,revoked_at") as any)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (opts.includeRevoked === false) query = query.is("revoked_at", null);
  if (opts.limit) query = query.limit(Math.min(Math.max(opts.limit, 1), 200));
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ApiKeyRecord[];
}

export function isKeyActive(k: Pick<ApiKeyRecord, "revoked_at" | "expires_at">, now = Date.now()): boolean {
  if (k.revoked_at) return false;
  if (k.expires_at && new Date(k.expires_at).getTime() < now) return false;
  return true;
}

export function sanitizeAllowedTools(input: unknown): string[] {
  if (!Array.isArray(input)) {
    if (typeof input === "string") {
      return input.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 50);
    }
    return [];
  }
  return input.map(String).map((t) => t.trim()).filter(Boolean).slice(0, 50);
}

function validateCreateInput(input: { name: string; scopes: string[]; expiresInDays: number | null }) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the key a name.");
  if (name.length > MAX_NAME_LEN) throw new Error(`Key name must be ≤ ${MAX_NAME_LEN} characters.`);
  const scopes = normalizeScopes(input.scopes);
  if (scopes.length === 0) throw new Error("Select at least one scope.");
  const invalid = scopes.filter((s) => !isValidScope(s));
  if (invalid.length > 0) throw new Error(`Unknown scope: ${invalid[0]}.`);
  if (input.expiresInDays !== null && input.expiresInDays !== undefined) {
    if (!Number.isFinite(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > MAX_EXPIRY_DAYS) {
      throw new Error(`Expiry must be between 1 and ${MAX_EXPIRY_DAYS} days, or no expiration.`);
    }
  }
  return { name, scopes };
}

/** Creates a key and returns the raw secret — the ONLY moment it exists
 * outside the browser that generated it. Persist nothing but the hash. */
export async function createApiKey(
  userId: string,
  input: { name: string; scopes: string[]; expiresInDays: number | null; readOnly?: boolean; allowedTools?: string[] | string },
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  if (!userId) throw new Error("Sign in to create an API key.");
  const { name, scopes } = validateCreateInput(input);
  const allowedTools = sanitizeAllowedTools(input.allowedTools ?? []);
  const { raw, prefix } = generateRawKey();
  const keyHash = await sha256Hex(raw);
  const expires_at = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null;
  const { data, error } = await (supabase
    .from("user_api_keys" as any)
    .insert({
      user_id: userId,
      name,
      prefix,
      key_hash: keyHash,
      scopes,
      expires_at,
      read_only: input.readOnly ?? false,
      allowed_tools: allowedTools,
    } as any)
    .select("id,user_id,name,prefix,scopes,read_only,allowed_tools,created_at,expires_at,last_used_at,revoked_at") as any)
    .single();
  if (error) throw error;
  if (!isNoskaKeyFormat(raw)) throw new Error("Generated key failed format check — retry.");
  return { record: data as ApiKeyRecord, rawKey: raw };
}

/** Rotation = create a replacement + revoke the old one atomically from
 * the user's perspective. Returns the new raw secret (shown once). */
export async function rotateApiKey(
  userId: string,
  existing: ApiKeyRecord,
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  if (!userId) throw new Error("Sign in to rotate an API key.");
  const created = await createApiKey(userId, {
    name: existing.name,
    scopes: Array.isArray(existing.scopes) ? existing.scopes : [],
    expiresInDays: existing.expires_at ? Math.max(1, Math.ceil((new Date(existing.expires_at).getTime() - Date.now()) / 86_400_000)) : null,
    readOnly: existing.read_only ?? false,
    allowedTools: Array.isArray(existing.allowed_tools) ? existing.allowed_tools : [],
  });
  const { error } = await supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", userId);
  if (error) {
    // Roll forward: revoke failed, so kill the new key too rather than
    // leaving two live credentials.
    await supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", created.record.id).eq("user_id", userId).then(undefined, () => {});
    throw error;
  }
  return created;
}

export async function revokeApiKey(keyId: string, userId?: string): Promise<void> {
  let q = supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId);
  if (userId) q = q.eq("user_id", userId);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteApiKey(keyId: string, userId?: string): Promise<void> {
  let q = supabase.from("user_api_keys").delete().eq("id", keyId);
  if (userId) q = q.eq("user_id", userId);
  const { error } = await q;
  if (error) throw error;
}
