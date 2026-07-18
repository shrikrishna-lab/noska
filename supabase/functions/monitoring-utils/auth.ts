import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface AdminInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function validateAdmin(token: string): Promise<AdminInfo | null> {
  try {
    const { data, error } = await supabase.rpc("validate_admin_session", { p_token: token });
    if (error || !data) return null;
    if (typeof data === "object" && data !== null) {
      return { id: String(data.id), name: String(data.name), email: String(data.email), role: String(data.role) };
    }
    if (typeof data === "string") {
      try { const p = JSON.parse(data); return { id: p.id, name: p.name, email: p.email, role: p.role }; } catch { return null; }
    }
    return null;
  } catch { return null; }
}

const ROLE_RANK: Record<string, number> = { support: 2, developer: 3, admin: 4, super_admin: 5 };

export function requireRole(admin: AdminInfo | null, minimum: string): boolean {
  if (!admin) return false;
  return (ROLE_RANK[admin.role] ?? 0) >= (ROLE_RANK[minimum] ?? 99);
}

export function unauthorized(msg = "Unauthorized: invalid or expired admin session") {
  return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { "Content-Type": "application/json" } });
}

export function forbidden(msg = "Forbidden: insufficient permissions") {
  return new Response(JSON.stringify({ error: msg }), { status: 403, headers: { "Content-Type": "application/json" } });
}

export function error(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

export function ok(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function getAuthToken(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return "";
}

export async function verifyAdminSession(req: Request): Promise<boolean> {
  const token = await getAuthToken(req);
  if (!token) return false;
  const admin = await validateAdmin(token);
  if (!admin) return false;
  return requireRole(admin, "support");
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}

export function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

export function resError(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
