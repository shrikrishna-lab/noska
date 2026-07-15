import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasRealCredentials = Boolean(url && key);

export const supabase = hasRealCredentials
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

export const SUPABASE_ENABLED = hasRealCredentials;
export const DEMO_MODE = !hasRealCredentials || String(import.meta.env.VITE_ADMIN_DEMO).toLowerCase() === "true";

let _adminToken: string | null = null;

export function setAdminToken(token: string | null) {
  _adminToken = token;
  if (token) sessionStorage.setItem("noska_admin_token", token);
  else sessionStorage.removeItem("noska_admin_token");
}

export function getAdminToken(): string | null {
  if (!_adminToken) _adminToken = sessionStorage.getItem("noska_admin_token");
  return _adminToken;
}
