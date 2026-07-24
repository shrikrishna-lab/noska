import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function clerkApi(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const key = Deno.env.get("CLERK_SECRET_KEY");
  if (!key) throw new Error("Clerk not configured");
  return fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function lookupClerkId(uuid: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("id", uuid)
    .single();
  return data?.user_id ?? null;
}

export async function clerkUsers(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const key = Deno.env.get("CLERK_SECRET_KEY");
  if (!key) throw new Error("Clerk not configured");

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const base = "https://api.clerk.com/v1";

  switch (action) {
    case "count":
      return fetch(`${base}/users?limit=1`, { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Clerk API ${r.status}`);
        const total = parseInt(r.headers.get("x-request-count") ?? "0", 10);
        return { total };
      });

    case "list":
      return fetch(`${base}/users?limit=${String(payload.limit ?? 50)}&offset=${String(payload.offset ?? 0)}`, { headers }).then((r) => r.json());

    case "user":
      return fetch(`${base}/users/${String(payload.userId ?? "")}`, { headers }).then((r) => r.json());

    case "sessions":
      return fetch(`${base}/users/${String(payload.userId ?? "")}/sessions`, { headers }).then((r) => r.json());

    case "organizations":
      return fetch(`${base}/users/${String(payload.userId ?? "")}/organizations`, { headers }).then((r) => r.json());

    // ── Ban user: Clerk ban + revoke sessions + Supabase ban_user RPC ──
    case "ban": {
      const uuid = String(payload.userId ?? "");
      const clerkId = await lookupClerkId(uuid);
      if (!clerkId) throw new Error("User not found in user_profiles");

      // Ban in Clerk (prevents future sign-in)
      const banRes = await clerkApi(`/users/${clerkId}/ban`, "POST");
      if (!banRes.ok) console.error("Clerk ban failed", await banRes.text());

      // Revoke all active sessions (kicks out current session)
      const revokeRes = await clerkApi(`/users/${clerkId}/revoke_sessions`, "POST");
      if (!revokeRes.ok) console.error("Clerk revoke_sessions failed", await revokeRes.text());

      // Supabase RPC
      const { error } = await supabase.rpc("ban_user", {
        p_user_id: uuid,
        p_reason: payload.reason ?? "",
        p_ban_type: payload.banType ?? "soft",
        p_expires_at: payload.expiresAt ?? null,
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase ban_user failed: ${error.message}`);
      return { success: true };
    }

    // ── Hard ban: same as ban + also deletes user data in Supabase ──
    case "hard_ban": {
      const uuid = String(payload.userId ?? "");
      const clerkId = await lookupClerkId(uuid);
      if (!clerkId) throw new Error("User not found in user_profiles");

      const banRes = await clerkApi(`/users/${clerkId}/ban`, "POST");
      if (!banRes.ok) console.error("Clerk ban failed", await banRes.text());

      const revokeRes = await clerkApi(`/users/${clerkId}/revoke_sessions`, "POST");
      if (!revokeRes.ok) console.error("Clerk revoke_sessions failed", await revokeRes.text());

      const { error } = await supabase.rpc("hard_ban_user", {
        p_user_id: uuid,
        p_reason: payload.reason ?? "",
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase hard_ban_user failed: ${error.message}`);
      return { success: true };
    }

    // ── Unban user: Clerk unban + Supabase unban_user RPC ──
    case "unban": {
      const uuid = String(payload.userId ?? "");
      // Try to find Clerk ID — if user_profiles was deleted, Clerk unban will be skipped
      const clerkId = await lookupClerkId(uuid).catch(() => null);
      if (clerkId) {
        const unbanRes = await clerkApi(`/users/${clerkId}/unban`, "POST");
        if (!unbanRes.ok) console.error("Clerk unban failed", await unbanRes.text());
      } else {
        console.warn("Clerk ID not found for unban — user_profiles may be deleted, skipping Clerk unban");
      }

      const { error } = await supabase.rpc("unban_user", {
        p_user_id: uuid,
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase unban_user failed: ${error.message}`);
      return { success: true };
    }

    // ── Delete user: Clerk delete + Supabase delete_user_data RPC ──
    case "delete": {
      const uuid = String(payload.userId ?? "");
      const clerkId = await lookupClerkId(uuid);
      if (!clerkId) throw new Error("User not found in user_profiles");

      // Delete from Clerk entirely (prevents any future sign-in)
      const deleteRes = await clerkApi(`/users/${clerkId}`, "DELETE");
      if (!deleteRes.ok) console.error("Clerk user delete failed", await deleteRes.text());

      const { error } = await supabase.rpc("delete_user_data", {
        p_user_id: uuid,
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase delete_user_data failed: ${error.message}`);
      return { success: true };
    }

    // ── Restore account: only Supabase (Clerk user was previously deleted) ──
    case "restore": {
      const { error } = await supabase.rpc("restore_account", {
        p_account_id: String(payload.accountId ?? ""),
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase restore_account failed: ${error.message}`);
      return { success: true };
    }

    // ── Permanent delete: only Supabase (Clerk user was previously deleted) ──
    case "permanent_delete": {
      const { error } = await supabase.rpc("permanently_delete_account", {
        p_account_id: String(payload.accountId ?? ""),
        p_session_token: String(payload.sessionToken ?? ""),
      });
      if (error) throw new Error(`Supabase permanently_delete_account failed: ${error.message}`);
      return { success: true };
    }

    default:
      throw new Error(`Unknown users action: ${action}`);
  }
}
