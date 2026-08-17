import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const ROLE_RANK: Record<string, number> = { marketing: 1, support: 2, developer: 3, admin: 4, super_admin: 5 };

function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

function resError(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

async function validateAdmin(token: string): Promise<{ id: string; role: string } | null> {
  try {
    const { data, error } = await supabase.rpc("validate_admin_session", { p_token: token });
    if (error || !data) return null;
    if (typeof data === "object" && data !== null) {
      return { id: data.id, role: data.role };
    }
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return { id: parsed.id, role: parsed.role };
      } catch { return null; }
    }
    return null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return resError("Method not allowed", 405);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return resError("Missing admin session", 401);

  const admin = await validateAdmin(token);
  if (!admin) return resError("Unauthorized", 401);
  if ((ROLE_RANK[admin.role] ?? 0) < ROLE_RANK.support) return resError("Insufficient role", 403);

  try {
    const body = await req.json();
    const { user_id, file_name, base64, content_type } = body as {
      user_id?: string; file_name?: string; base64?: string; content_type?: string;
    };
    if (!user_id || !file_name || !base64) return resError("user_id, file_name and base64 are required", 400);

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length === 0) return resError("Empty file", 400);
    if (bytes.length > 2 * 1024 * 1024) return resError("Image must be under 2 MB", 400);

    const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const path = `avatars/${user_id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === "images")) {
      await supabase.storage.createBucket("images", { public: true });
    }

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(path, bytes, {
        cacheControl: "3600",
        contentType: content_type || "image/png",
        upsert: false,
      });
    if (uploadError) return resError(`Upload failed: ${uploadError.message}`, 500);

    const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
    return res({ url: publicData.publicUrl });
  } catch {
    return resError("Invalid request body", 400);
  }
});