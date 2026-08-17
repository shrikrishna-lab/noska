import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useClerk, useSignIn } from "@clerk/react";
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
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {error && (
              <div className="w-full mt-4">
                <AuthError message={error} />
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
