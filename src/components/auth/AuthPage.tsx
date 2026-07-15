import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { supabase } from "../../lib/supabase";
import AuthBackground from "./AuthBackground";
import AuthProviders from "./AuthProviders";
import AuthError from "./AuthError";
import AuthLoading from "./AuthLoading";

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

interface AuthSuccessData {
  userId: string;
  userName?: string;
  email?: string;
  avatarUrl?: string | null;
}

interface AuthPageProps {
  onAuthSuccess: (data: AuthSuccessData) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = session.user;
        onAuthSuccess({
          userId: user.id,
          userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Workspace User',
          email: user.email,
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        });
      }
      if (event === 'SIGNED_OUT') {
        setIsConnecting(false);
        setLoadingProvider(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [onAuthSuccess]);

  const handleProviderClick = async (provider: "github" | "google") => {
    setError(null);
    setLoadingProvider(provider);
    setIsConnecting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        // Must land back on a route that mounts App (which imports the
        // Supabase client and runs detectSessionInUrl) — "/" is now the
        // public marketing LandingPage and never touches Supabase, so the
        // OAuth callback tokens would otherwise be stranded in the URL.
        provider,
        options: { redirectTo: `${window.location.origin}/login` }
      });
      if (signInError) throw signInError;
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
