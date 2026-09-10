import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useAuth, useClerk, useSignIn } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthProviders from "./AuthProviders";
import AuthError from "./AuthError";
import AuthLoading from "./AuthLoading";
import { capture } from "../../lib/posthog";
import { markOAuthIntent } from "../../lib/oauthIntent";
import { isDesktop } from "../../lib/desktop/platform";
import { startBrowserAuth } from "../../lib/desktop/browserAuth";

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
  const { signIn, errors } = useSignIn();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProviderClick = async (provider: "github" | "google" | "microsoft" | "apple") => {
    if (isDesktop()) {
      void startBrowserAuth(provider === "google" || provider === "apple" || provider === "github" ? provider : "web");
      return;
    }
    setError(null);
    setLoadingProvider(provider);
    setIsConnecting(true);
    capture("signup_started");
    if (provider === "google") capture("google_login");
    if (provider === "microsoft") capture("microsoft_login");
    // Already holding a session — starting OAuth again makes Clerk's
    // signIn.create throw, and the fallback chain ends up on the Account
    // Portal, which bounces to its Home URL (the marketing site) instead
    // of the app. Route straight into the workspace; App's bootstrap /
    // post-auth effects resolve profile and onboarding state from here.
    if (isSignedIn) {
      navigate("/dashboard", { replace: true });
      return;
    }
    // Remember that we left for OAuth. If the Account Portal loses the
    // pending sign-in and dumps the user on its Home URL (the marketing
    // site) instead of /sso-callback, MarketingLayout uses this to bring
    // the now-signed-in user into their workspace.
    markOAuthIntent();
    try {
      const strategy =
        provider === "github" ? "oauth_github" :
        provider === "google" ? "oauth_google" :
        provider === "apple" ? "oauth_apple" : "oauth_microsoft";
      // Stay on the current origin: www.noska.me serves the full app, and
      // app.noska.me is not a live production host (dead DNS) — rewriting
      // there sent every completed OAuth into a connection error.
      const appOrigin = window.location.origin;
      const redirectUrl = `${appOrigin}/sso-callback`;
      // Primary path (stable across Clerk versions): start the OAuth sign-in,
      // then navigate straight to the provider — this keeps the CUSTOM Noska
      // UI and never bounces through Clerk's hosted accounts.* page.
      try {
        await signIn.create({ strategy, redirectUrl } as never);
        const external = (signIn as unknown as {
          firstFactorVerification?: { externalVerificationRedirectURL?: URL | string | null };
        }).firstFactorVerification?.externalVerificationRedirectURL;
        if (external) {
          window.location.assign(external as unknown as string);
          return;
        }
      } catch {
        // fall through to the legacy helpers below
      }
      // Legacy helper on some bundles: authenticates + redirects in one call.
      // redirectUrlComplete must be /sso-callback — the Account Portal
      // validates this URL and silently falls back to its configured Home
      // URL (the marketing site) when a completed sign-in has nowhere to go.
      const authenticateWithRedirect = (signIn as typeof signIn & {
        authenticateWithRedirect?: (params: Record<string, string>) => Promise<void>;
      }).authenticateWithRedirect;
      if (typeof authenticateWithRedirect === "function") {
        await authenticateWithRedirect({ strategy, redirectUrl, redirectUrlComplete: `${appOrigin}/sso-callback` });
        return;
      }
      // Last resort only: Clerk's hosted sign-in page. Force/fallback URLs
      // also land on /sso-callback so AuthCallbackScreen does the routing.
      await clerk.redirectToSignIn({
        signInForceRedirectUrl: `${appOrigin}/sso-callback`,
        signInFallbackRedirectUrl: `${appOrigin}/sso-callback`,
      });
    } catch (e) {
      setError((e as Error).message || "Failed to sign in. Please try again.");
      setLoadingProvider(null);
      setIsConnecting(false);
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
