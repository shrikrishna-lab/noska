import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabaseAnon } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useSignIn } from "@clerk/react";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthProviders from "../../components/auth/AuthProviders";
import AuthError from "../../components/auth/AuthError";
import AuthLoading from "../../components/auth/AuthLoading";

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { signIn } = useSignIn();
  const [state, setState] = useState<"loading" | "valid" | "expired" | "used" | "invalid">("loading");
  const [invitee, setInvitee] = useState<{ name: string; email: string } | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !supabaseAnon) return;
    (async () => {
      const { data, error } = await supabaseAnon
        .rpc("get_invite_by_code" as never, { p_code: code.toUpperCase() } as never) as never;

      if (error || !data) { setState("invalid"); return; }
      const entry = data as Record<string, unknown>;
      if (entry.status === "accepted") { setState("used"); return; }
      if (entry.invite_expires_at && new Date(entry.invite_expires_at as string) < new Date()) { setState("expired"); return; }
      setInvitee({ name: entry.name as string, email: entry.email as string });
      setState("valid");
    })();
  }, [code]);

  const handleOAuthSignUp = async (provider: "github" | "google" | "microsoft") => {
    setError(null);
    setLoadingProvider(provider);
    setIsConnecting(true);
    if (!signIn) {
      setError("Authentication not ready. Please try again.");
      setLoadingProvider(null);
      setIsConnecting(false);
      return;
    }
    try {
      const strategy = provider === "github" ? "oauth_github" : provider === "google" ? "oauth_google" : "oauth_microsoft";
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/sso-callback`,
      });
      if (error) {
        setError(error.message || "Failed to sign up. Please try again.");
        setLoadingProvider(null);
        setIsConnecting(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sign up. Please try again.");
      setLoadingProvider(null);
      setIsConnecting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            className="flex flex-col items-center w-full text-center"
          >
            <div className="w-16 h-16 mb-6 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg">
              <span className="text-3xl">🔗</span>
            </div>
            <h1 className="mb-2 text-lg font-semibold text-slate-800">Invalid Invite Link</h1>
            <p className="mb-6 text-sm text-slate-500">This invite link doesn't exist. Please check the link or request a new one.</p>
            <a href="/" className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700">Go home</a>
          </motion.div>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            className="flex flex-col items-center w-full text-center"
          >
            <div className="w-16 h-16 mb-6 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="mb-2 text-lg font-semibold text-slate-800">Invite Expired</h1>
            <p className="mb-6 text-sm text-slate-500">This invitation has expired. Please request a new one from the admin.</p>
            <a href="/" className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700">Go home</a>
          </motion.div>
        </div>
      </div>
    );
  }

  if (state === "used") {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            className="flex flex-col items-center w-full text-center"
          >
            <div className="w-16 h-16 mb-6 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="mb-2 text-lg font-semibold text-slate-800">Already Accepted</h1>
            <p className="mb-6 text-sm text-slate-500">This invitation has already been used. Sign in to access your workspace.</p>
            <a href="/login" className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700">Sign in</a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden font-sans select-none">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          className="flex flex-col items-center w-full"
        >
          <div className="w-16 h-16 mb-8 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg animate-pulse-subtle">
            <img
              src="/logo.png"
              alt="Noska Logo"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-slate-800">Welcome{invitee?.name ? `, ${invitee.name}` : ""}!</h1>
            <p className="mt-1 text-sm text-slate-500">You've been invited to join <strong className="text-slate-700">Noska</strong>.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <div className="w-full mb-3">
                <AuthError message={error} />
              </div>
            )}
          </AnimatePresence>

          <div className="w-full flex flex-col gap-3">
            <AuthProviders
              onProviderClick={handleOAuthSignUp}
              loadingProvider={loadingProvider}
              disabled={isConnecting}
            />
          </div>

          <p className="mt-6 text-xs text-slate-400">
            By continuing, you agree to Noska's Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {isConnecting && (
          <AuthLoading message="Creating your account..." />
        )}
      </AnimatePresence>
    </div>
  );
}
