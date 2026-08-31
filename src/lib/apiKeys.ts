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

/** Cryptographically random key: nsk_<26 chars> (~155 bits of entropy). */
function generateRawKey(): { raw: string; prefix: string } {
  const bytes = new Uint8Array(26);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => BASE62[b % BASE62.length]).join("");
  const raw = `nsk_${body}`;
  return { raw, prefix: raw.slice(0, 12) };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const { data, error } = await (supabase
    .from("user_api_keys" as any)
    .select("id,user_id,name,prefix,scopes,read_only,allowed_tools,created_at,expires_at,last_used_at,revoked_at") as any)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKeyRecord[];
}

/** Creates a key and returns the raw secret — the ONLY moment it exists
 * outside the browser that generated it. Persist nothing but the hash. */
export async function createApiKey(
  userId: string,
  input: { name: string; scopes: string[]; expiresInDays: number | null; readOnly?: boolean; allowedTools?: string[] },
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const { raw, prefix } = generateRawKey();
  const keyHash = await sha256Hex(raw);
  const expires_at = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null;
  const { data, error } = await (supabase
    .from("user_api_keys" as any)
    .insert({
      user_id: userId,
      name: input.name.trim() || "Untitled key",
      prefix,
      key_hash: keyHash,
      scopes: input.scopes,
      expires_at,
      read_only: input.readOnly ?? false,
      allowed_tools: input.allowedTools ?? [],
    } as any)
    .select("id,user_id,name,prefix,scopes,read_only,allowed_tools,created_at,expires_at,last_used_at,revoked_at") as any)
    .single();
  if (error) throw error;
  return { record: data as ApiKeyRecord, rawKey: raw };
}

/** Rotation = create a replacement + revoke the old one atomically from
 * the user's perspective. Returns the new raw secret (shown once). */
export async function rotateApiKey(
  userId: string,
  existing: ApiKeyRecord,
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const created = await createApiKey(userId, {
    name: existing.name,
    scopes: existing.scopes,
    expiresInDays: existing.expires_at ? Math.max(1, Math.ceil((new Date(existing.expires_at).getTime() - Date.now()) / 86_400_000)) : null,
  });
  const { error } = await supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", existing.id);
  if (error) {
    // Roll forward: revoke failed, so kill the new key too rather than
    // leaving two live credentials.
    await supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", created.record.id).then(undefined, () => {});
    throw error;
  }
  return created;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const { error } = await supabase.from("user_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId);
  if (error) throw error;
}

export async function deleteApiKey(keyId: string): Promise<void> {
  const { error } = await supabase.from("user_api_keys").delete().eq("id", keyId);
  if (error) throw error;
}
