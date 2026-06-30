import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import AuthBackground from "./AuthBackground";
import AuthCard from "./AuthCard";
import AuthProviders from "./AuthProviders";
import AuthLoading from "./AuthLoading";
import AuthError from "./AuthError";
import { screenTransitionVariants, itemVariants } from "./useAuthMotion";

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("signin");
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

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
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (signInError) throw signInError;
    } catch (e) {
      setError(e.message || "Failed to sign in. Please try again.");
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setEmailLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (signUpError) throw signUpError;
        if (data?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Sign in instead.");
        } else {
          setIsConnecting(true);
          setError("Check your email for the confirmation link.");
        }
      } else {
        setIsConnecting(true);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) throw signInError;
      }
    } catch (e) {
      setError(e.message || "Authentication failed.");
      setIsConnecting(false);
    }
    setEmailLoading(false);
  };

  const toggleMode = () => {
    if (isConnecting || loadingProvider || emailLoading) return;
    setError(null);
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
  };

  const handleLogoDoubleClick = () => {
    if (isConnecting || loadingProvider) return;
    setError("Connection timed out. Please check your network and try again.");
  };

  return (
    <motion.div
      variants={screenTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#030307] z-40 overflow-hidden font-sans select-none"
    >
      <div aria-hidden="true">
        <AuthBackground />
      </div>

      <div className="relative z-10 w-full px-4 flex justify-center">
        <AuthCard>
          <AnimatePresence>
            {isConnecting && (
              <AuthLoading message="Setting up your environment..." />
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-6">
            <button
              onClick={handleLogoDoubleClick}
              className="w-14 h-14 mb-4 bg-white/5 rounded-xl border border-white/[0.08] flex items-center justify-center p-3 hover:border-white/[0.15] focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c12] transition-colors cursor-default"
              title="Noska Brand Mark"
              aria-label="Noska brand mark"
            >
              <img src="/logo.png" alt="Noska Logo" className="w-full h-full object-contain pointer-events-none select-none animate-pulse-slow" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              {mode === "signin" ? "Sign in to Noska" : "Create your Noska workspace"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-[280px]">
              {mode === "signin"
                ? "Your AI workspace awaits. Sign in to continue."
                : "Start writing, editing, and thinking with agentic support."}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && <AuthError key="error" message={error} />}
          </AnimatePresence>

          <motion.div variants={itemVariants}>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 mb-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                disabled={isConnecting || emailLoading}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-noska-blue focus:ring-1 focus:ring-noska-blue/30 transition-all disabled:opacity-40"
                autoFocus
                aria-label="Email address"
                required
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                disabled={isConnecting || emailLoading}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-noska-blue focus:ring-1 focus:ring-noska-blue/30 transition-all disabled:opacity-40"
                aria-label="Password"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={isConnecting || emailLoading}
                className="w-full py-3 rounded-xl bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c12]"
              >
                {emailLoading ? "Please wait..." : mode === "signin" ? "Sign in with Email" : "Create account"}
              </button>
            </form>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-[#0c0c12]/70 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">or continue with</span></div>
            </div>

            <AuthProviders onProviderClick={handleProviderClick} loadingProvider={loadingProvider} disabled={isConnecting || emailLoading} />
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 pt-5 border-t border-white/[0.05] text-center">
            <button
              type="button"
              onClick={toggleMode}
              disabled={isConnecting || !!loadingProvider || emailLoading}
              className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer font-medium focus:outline-none focus-visible:underline hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={mode === "signin" ? "Switch to sign up screen" : "Switch to sign in screen"}
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have a workspace? Sign in"}
            </button>
          </motion.div>
        </AuthCard>
      </div>
    </motion.div>
  );
}
