import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_ENABLED, setAdminToken, getAdminToken } from "./supabase";
import {
  useSessionExpiredListener,
  resetSessionExpiredFlag,
  type SessionExpiredDetail,
} from "./session-expired";
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

interface AuthProviderProps {
  children: ReactNode;
  /**
   * The shared React Query client. When a session-expired event fires,
   * the provider clears the cache so stale "authenticated" data doesn't
   * briefly re-render after the user has been logged out.
   */
  queryClient?: QueryClient;
}

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    (async () => {
      if (SUPABASE_ENABLED && supabase) {
        try {
          const { data: hasAdmin } = await supabase.rpc("check_admin_exists");
          setNeedsSetup(hasAdmin === false);
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

  // ─── React to session-expired events fired by the fetch wrapper ───
  // The fetch wrapper in supabase.ts detects 42501/UNAUTHORIZED and routes
  // it through session-expired.ts, which fires SESSION_EXPIRED_EVENT.
  // Here we flip user → null so AuthGate renders <Login />, and clear the
  // query cache so no stale data lingers.
  const handleSessionExpired = useCallback((_detail: SessionExpiredDetail) => {
    setUser(null);
    setError(null);
    if (queryClient) {
      queryClient.clear();
    }
  }, [queryClient]);
  useSessionExpiredListener(handleSessionExpired);

  const setupFirstAdmin = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    if (!SUPABASE_ENABLED || !supabase) {
      setError("Supabase is not configured. Check your .env file.");
      return;
    }
    try {
      const { data: created, error: setupError } = await supabase.rpc("setup_first_admin", { p_email: email, p_name: name, p_password: password });
      if (setupError) {
        if (setupError.message?.includes("ADMIN_ALREADY_EXISTS")) {
          setError("An admin account already exists. Please sign in instead.");
        } else {
          setError("Failed to create admin account: " + setupError.message);
        }
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
      resetSessionExpiredFlag();
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
      // After a fresh login, allow future session-expiry detection again
      resetSessionExpiredFlag();
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