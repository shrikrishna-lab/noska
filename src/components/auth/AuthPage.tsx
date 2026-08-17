import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useClerk, useSignIn } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthProviders from "./AuthProviders";
import AuthError from "./AuthError";
import AuthLoading from "./AuthLoading";
import { capture } from "../../lib/posthog";

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 160,
      damping: 24,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -12,
    transition: {
      duration: 0.25,
      ease: "easeIn"
    }
  }
};

interface AuthPageProps {
  onAuthSuccess?: (data: never) => void;
}

export default function AuthPage(_props: AuthPageProps) {
const { signIn, errors, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [authStep, setAuthStep] = useState<"credentials" | "mfa">("credentials");
  const [mfaMethod, setMfaMethod] = useState<"totp" | "backup_code" | "email_code" | "phone_code">("totp");
  const [error, setError] = useState<string | null>(null);

  const finishSignIn = async () => {
    const { error: finalizeError } = await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const url = decorateUrl("/dashboard");
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          navigate(url, { replace: true });
        }
      },
    });
    if (finalizeError) throw finalizeError;
  };

  const handleProviderClick = async (provider: "github" | "google" | "microsoft") => {
    setError(null);
    setLoadingProvider(provider);
    setIsConnecting(true);
    capture("signup_started");
    if (provider === "google") capture("google_login");
    if (provider === "microsoft") capture("microsoft_login");
try {
      const strategy = provider === "github" ? "oauth_github" : provider === "google" ? "oauth_google" : "oauth_microsoft";
      // Support both Clerk runtime APIs. Some production Clerk bundles still
      // expose the legacy `sso` helper even though newer typings expose
      // `authenticateWithRedirect`; both use the same callback route below.
      // Keep the auth callback on the canonical app host. The marketing
      // alias (www.noska.me) must not send an authenticated user back to the
      // public login page after Clerk completes the OAuth exchange.
      const appOrigin = window.location.hostname === "www.noska.me"
        ? "https://app.noska.me"
        : window.location.origin;
      const redirectUrl = `${appOrigin}/sso-callback`;
      const authenticateWithRedirect = (signIn as typeof signIn & {
        authenticateWithRedirect?: (params: Record<string, string>) => Promise<void>;
        sso?: (params: Record<string, string>) => Promise<void>;
      }).authenticateWithRedirect;
      if (typeof authenticateWithRedirect === "function") {
        await authenticateWithRedirect({ strategy, redirectUrl, redirectUrlComplete: `${appOrigin}/login` });
      } else {
        // Older Clerk runtimes expose a legacy `sso` helper that can resolve
        // without starting navigation. Use Clerk's hosted sign-in flow for
        // those runtimes; it still offers all enabled providers and returns to
        // the canonical app host after authentication.
        await clerk.redirectToSignIn({
          signInForceRedirectUrl: `${appOrigin}/login`,
          signInFallbackRedirectUrl: `${appOrigin}/login`,
        });
      }
    } catch (e) {
      setError((e as Error).message || "Failed to sign in. Please try again.");
      setLoadingProvider(null);
      setIsConnecting(false);
    }
  };

  const handlePasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsConnecting(true);
    try {
      const { error: passwordError } = await signIn.password({ identifier: email, password });
      if (passwordError) throw passwordError;
      if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        setAuthStep("mfa");
        return;
      }
      if (signIn.status === "complete") await finishSignIn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sign in. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMfaSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsConnecting(true);
    try {
      const result = mfaMethod === "totp"
        ? await signIn.mfa.verifyTOTP({ code: mfaCode })
        : mfaMethod === "backup_code"
          ? await signIn.mfa.verifyBackupCode({ code: mfaCode })
          : mfaMethod === "email_code"
            ? await signIn.mfa.verifyEmailCode({ code: mfaCode })
            : await signIn.mfa.verifyPhoneCode({ code: mfaCode });
      if (result.error) throw result.error;
      if (signIn.status === "complete") await finishSignIn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "MFA verification failed. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const selectMfaMethod = async (method: "totp" | "backup_code" | "email_code" | "phone_code") => {
    setMfaMethod(method);
    setError(null);
    try {
      if (method === "email_code") {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) throw sendError;
      }
      if (method === "phone_code") {
        const { error: sendError } = await signIn.mfa.sendPhoneCode();
        if (sendError) throw sendError;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not send the verification code.");
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden font-sans select-none">
      {/* Background Pixel Hero Reveal Overlay */}
      <AuthBackground />

      {/* Central Login Brand & Providers Container */}
      <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col items-center w-full"
        >
          {/* Noska Brand Logo */}
          <div className="w-16 h-16 mb-8 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg animate-pulse-subtle">
            <img
              src="/logo.png"
              alt="Noska Logo"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>

          {/* Social Logins */}
          <div className="w-full flex flex-col gap-3">
            <AuthProviders
              onProviderClick={handleProviderClick}
              loadingProvider={loadingProvider}
              disabled={isConnecting}
            />
          </div>

          <div className="relative flex items-center justify-center my-6 select-none">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <span className="relative px-3 bg-[#f8fafc] text-[10px] font-mono tracking-widest text-slate-400 uppercase">or</span>
          </div>

          {authStep === "credentials" ? (
            <form onSubmit={handlePasswordSignIn} className="w-full flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={isConnecting || fetchStatus === "fetching"}
                className="w-full h-11 rounded-[8px] bg-slate-800 text-white text-xs font-semibold transition hover:bg-slate-700 disabled:opacity-40"
              >
                {isConnecting ? "Signing in..." : "Sign in with Email"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSignIn} className="w-full flex flex-col gap-3">
              <p className="text-xs text-slate-500 text-center">Enter your verification code to continue.</p>
              <div className="grid grid-cols-2 gap-2">
                {(["totp", "backup_code", "email_code", "phone_code"] as const).map((method) => (
                  <button key={method} type="button" onClick={() => selectMfaMethod(method)} className={`h-9 rounded-md text-xs ${mfaMethod === method ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {method === "totp" ? "Authenticator" : method === "backup_code" ? "Backup code" : method === "email_code" ? "Email code" : "Phone code"}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="Verification code"
                autoComplete="one-time-code"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
              <button type="submit" disabled={isConnecting} className="w-full h-11 rounded-[8px] bg-slate-800 text-white text-xs font-semibold transition hover:bg-slate-700 disabled:opacity-40">
                {isConnecting ? "Verifying..." : "Verify and continue"}
              </button>
            </form>
          )}

          {/* Error notifications */}
          <AnimatePresence mode="wait">
            {(error || errors?.global?.[0]?.message) && (
              <div className="w-full mt-4">
                <AuthError message={error || errors?.global?.[0]?.message} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Screen blocker overlay when authentication is connecting */}
      <AnimatePresence>
        {isConnecting && (
          <AuthLoading message="Connecting to your workspace..." />
        )}
      </AnimatePresence>
    </div>
  );
}
