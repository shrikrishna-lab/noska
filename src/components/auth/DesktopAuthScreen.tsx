// Desktop sign-in screen — QuickLink ("Continue with Web").
//
// One button: opens the system browser at the existing Noska Web login
// (Google / Apple / GitHub / Microsoft). After the user signs in there,
// the browser hands back via noska://auth/callback and the app exchanges
// the one-time transaction for a real Supabase session. The legacy
// pairing-code flow was removed.

import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  browserAuthVersion,
  cancelBrowserAuth,
  discardBrowserAuth,
  getBrowserAuthState,
  resumeBrowserAuth,
  reopenBrowser,
  startBrowserAuth,
  subscribeBrowserAuth,
} from "../../lib/desktop/browserAuth";
import { devSignInLocal, isDevBypassAvailable } from "../../lib/devAuth";

const TERMS_URL = "https://www.noska.me/terms";
const PRIVACY_URL = "https://www.noska.me/privacy";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin ${className}`}
      aria-hidden
    />
  );
}

export default function DesktopAuthScreen() {
  const navigate = useNavigate();
  useSyncExternalStore(subscribeBrowserAuth, browserAuthVersion);
  const { status, authUrl, error, pollError } = getBrowserAuthState();
  // Dev-only local sign-in — removed entirely from production builds.
  const devBypass = isDevBypassAvailable();
  const handleDevSignIn = () => devSignInLocal("Dev Tester");

  // On success the paired identity appears and the app bootstrap routes
  // into the workspace/onboarding. Brief success beat so the transition
  // reads as one continuous flow — never back to the login screen.
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    return () => clearTimeout(t);
  }, [status, navigate]);

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 select-none">
        <div className="text-center" data-testid="desktop-auth-success">
          <img src="/logo.png" alt="Noska" className="h-14 mx-auto mb-6" />
          <h1 className="text-xl font-bold text-slate-900">Signed in successfully</h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Spinner />
            <p className="text-sm text-slate-500">Loading Noska…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "starting" || status === "waiting" || status === "exchanging") {
    const message =
      status === "starting"
        ? "Opening browser…"
        : status === "exchanging"
          ? "Finishing sign-in…"
          : "Waiting for authentication…";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 select-none">
        <div className="w-full max-w-md text-center" data-testid="desktop-auth-waiting">
          <img src="/logo.png" alt="Noska" className="h-14 mx-auto mb-8" />
          <h1 className="text-2xl font-bold text-slate-900">Continue in browser</h1>
          <p className="text-sm text-slate-500 mt-3 max-w-xs mx-auto">
            Your browser has been opened to securely sign in to Noska.
          </p>
          <div className="flex items-center justify-center mt-10 mb-2">
            <motion.span
              className="block h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-700"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
              aria-hidden
            />
          </div>
          <p className="text-sm text-slate-600 h-5" aria-live="polite">
            {pollError ?? message}
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            {status === "waiting" && (
              <button
                type="button"
                onClick={() => void reopenBrowser()}
                disabled={!authUrl}
                className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-5 py-3 hover:bg-slate-700 transition disabled:opacity-40"
              >
                Reopen browser
              </button>
            )}
            <button
              type="button"
              onClick={() => cancelBrowserAuth()}
              className="rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold px-4 py-3 hover:border-slate-400 hover:text-slate-800 transition"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-10">
            Finish signing in in your browser — Noska will open automatically.
          </p>
        </div>
      </div>
    );
  }

  if (status === "resumable") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 select-none">
        <div className="w-full max-w-md text-center" data-testid="desktop-auth-resumable">
          <img src="/logo.png" alt="Noska" className="h-14 mx-auto mb-8" />
          <h1 className="text-2xl font-bold text-slate-900">Continue signing in?</h1>
          <p className="text-sm text-slate-500 mt-3">
            You started signing in to Noska in your browser but it didn't finish.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={() => {
                void resumeBrowserAuth();
                void reopenBrowser();
              }}
              className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-5 py-3 hover:bg-slate-700 transition"
            >
              Continue signing in
            </button>
            <button
              type="button"
              onClick={() => discardBrowserAuth()}
              className="rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold px-4 py-3 hover:border-slate-400 hover:text-slate-800 transition"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "expired" || status === "failed" || status === "error") {
    const title =
      status === "expired"
        ? "Your sign-in session expired."
        : status === "error"
          ? "Couldn't connect to Noska."
          : "We couldn't return to Noska automatically.";
    const detail =
      status === "error"
        ? error ?? "Check your internet connection and try again."
        : status === "expired"
          ? "Sign-in attempts are valid for 10 minutes."
          : error ?? "Check your internet connection and try again.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 select-none">
        <div className="w-full max-w-md text-center" data-testid="desktop-auth-error">
          <img src="/logo.png" alt="Noska" className="h-14 mx-auto mb-8" />
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-3">{detail}</p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={() => discardBrowserAuth()}
              className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-5 py-3 hover:bg-slate-700 transition"
            >
              {status === "expired" ? "Sign In Again" : "Try Again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Idle — QuickLink single entry point.
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 select-none overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        className="w-full max-w-[360px] flex flex-col items-center"
        data-testid="desktop-auth-idle"
      >
        <div className="w-16 h-16 mb-7 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg">
          <img
            src="/logo.png"
            alt="Noska Logo"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 text-center">Welcome to Noska</h1>
        <p className="text-sm text-slate-500 mt-2 text-center">
          Sign in to continue to your workspace.
        </p>

        <button
          type="button"
          onClick={() => void startBrowserAuth("web")}
          disabled={(status as string) === "starting"}
          className="w-full h-11 mt-9 rounded-[8px] bg-slate-800 text-white font-semibold text-xs hover:bg-slate-700 transition-all duration-150 disabled:opacity-40 shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40"
        >
          {(status as string) === "starting" ? "Opening browser…" : "Continue with Web"}
      </button>

        {devBypass && (
        <button
          type="button"
          onClick={handleDevSignIn}
          className="w-full h-11 mt-3 rounded-[8px] border border-dashed border-slate-300 text-slate-500 font-semibold text-xs hover:border-slate-400 hover:text-slate-700 transition-all duration-150 focus:outline-none"
        >
          Dev sign-in (local, no account)
        </button>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 text-center mt-4"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 mt-9">
          <a
            href={TERMS_URL}
            onClick={(e) => { e.preventDefault(); import("../../lib/desktop/links").then(({ openExternal }) => void openExternal(TERMS_URL)); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Terms
          </a>
          <span className="text-slate-300 text-xs">·</span>
          <a
            href={PRIVACY_URL}
            onClick={(e) => { e.preventDefault(); import("../../lib/desktop/links").then(({ openExternal }) => void openExternal(PRIVACY_URL)); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Privacy
          </a>
        </div>
      </motion.div>
    </div>
  );
}
