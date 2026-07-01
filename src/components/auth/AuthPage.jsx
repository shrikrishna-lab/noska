import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import AuthBackground from "./AuthBackground";
import AuthProviders from "./AuthProviders";
import AuthError from "./AuthError";

const containerVariants = {
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

export default function AuthPage({ onAuthSuccess }) {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

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

  const handleProviderClick = async (provider) => {
    setError(null);
    setLoadingProvider(provider);
    setIsConnecting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (signInError) throw signInError;
    } catch (e) {
      setError(e.message || "Failed to sign in. Please try again.");
      setLoadingProvider(null);
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#000000] z-40 overflow-hidden font-sans select-none">
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
          <div className="w-16 h-16 mb-8 bg-[#09090c] border border-white/[0.08] flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-2xl">
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
    </div>
  );
}
