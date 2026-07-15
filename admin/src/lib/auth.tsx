import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase, SUPABASE_ENABLED, setAdminToken, getAdminToken } from "./supabase";
import type { AdminRole } from "./rbac";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  setupFirstAdmin: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  needsSetup: boolean;
  checkingSetup: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    (async () => {
      if (SUPABASE_ENABLED && supabase) {
        try {
          const { count } = await supabase.from("admin_users").select("id", { count: "exact", head: true });
          setNeedsSetup(count === 0);
        } catch { setNeedsSetup(false); }
        setCheckingSetup(false);
        const token = getAdminToken();
        if (token) {
          try {
            const { data, error: rpcErr } = await supabase.rpc("validate_admin_session", { p_token: token });
            if (!rpcErr && data) setUser(data as AuthUser);
            else { setAdminToken(null); }
          } catch { setAdminToken(null); }
        }
      } else { setCheckingSetup(false); }
      setLoading(false);
    })();
  }, []);

  const setupFirstAdmin = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    if (!SUPABASE_ENABLED || !supabase) {
      setError("Supabase is not configured. Check your .env file.");
      return;
    }
    try {
      const { count } = await supabase.from("admin_users").select("id", { count: "exact", head: true });
      if (count && count > 0) {
        setError("An admin account already exists. Please sign in instead.");
        return;
      }
      const { error: insertError } = await supabase.from("admin_users").insert({ name, email, role: "super_admin" });
      if (insertError) {
        setError("Failed to create admin record: " + insertError.message);
        return;
      }
      const { error: pwdError } = await supabase.rpc("set_admin_password", { p_email: email, p_password: password, p_session_token: null });
      if (pwdError) {
        await supabase.from("admin_users").delete().eq("email", email);
        setError("Failed to set password: " + pwdError.message);
        return;
      }
      const { data: loginData, error: loginError } = await supabase.rpc("admin_login", { p_email: email, p_password: password });
      if (loginError || !loginData || loginData.error) {
        setError("Admin created but login failed. Try signing in.");
        return;
      }
      setAdminToken(loginData.token);
      setUser(loginData.user as AuthUser);
      setNeedsSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!SUPABASE_ENABLED || !supabase) {
      setError("Supabase is not configured. Check your .env file.");
      return;
    }
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_login", { p_email: email, p_password: password });
      if (rpcError) {
        setError("An unexpected error occurred. Please try again.");
        return;
      }
      if (data?.error) {
        setError(data.error === "TOO_MANY_ATTEMPTS" ? "Too many attempts. Try again in 15 minutes." : "Access denied. Invalid email or password.");
        return;
      }
      setAdminToken(data.token);
      setUser(data.user as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }, []);

  const signOut = useCallback(async () => {
    const token = getAdminToken();
    if (token && supabase) {
      try { await supabase.rpc("admin_logout", { p_token: token }); } catch { }
    }
    setAdminToken(null);
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, setupFirstAdmin, signOut, isAuthenticated: !!user, needsSetup, checkingSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}