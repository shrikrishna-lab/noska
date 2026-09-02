// Desktop sign-in screen — the browser-first flow.
//
// Idle shows the provider chooser; starting a provider opens the system
// browser and flips to the "Continue in browser" waiting state. The legacy
// pairing-code screen stays reachable as a fallback for machines where the
// noska:// handoff doesn't work (unregistered scheme, locked-down browser).

import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProviderButton from "./ProviderButton";
import PairingScreen from "./PairingScreen";
import {
  browserAuthVersion,
  cancelBrowserAuth,
  discardBrowserAuth,
  getBrowserAuthState,
  resumeBrowserAuth,
  reopenBrowser,
  startBrowserAuth,
  subscribeBrowserAuth,
  type BrowserAuthProvider,
  type BrowserAuthStatus,
} from "../../lib/desktop/browserAuth";

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
  const [showPairingFallback, setShowPairingFallback] = useState(false);
  const { status, provider, authUrl, error, pollError } = getBrowserAuthState();

  // When the handoff completes, the paired identity appears and the app
  // bootstrap routes into the workspace/onboarding. Brief success beat so
  // the transition reads as one continuous flow — never back to login.
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    return () => clearTimeout(t);
  }, [status, navigate]);

  if (showPairingFallback) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPairingFallback(false)}
          className="fixed top-5 left-5 z-50 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold px-4 py-2.5 hover:border-slate-400 hover:text-slate-800 transition shadow-sm"
        >
          ← Back
        </button>
        <PairingScreen />
      </div>
    );
  }

  /* ── success ─────────────────────────────────────────────────────────── */
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

  /* ── waiting for the browser ─────────────────────────────────────────── */
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
                className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-5 py-3 hover:bg-slate-700 transition disabled:opacity-40"
                disabled={!authUrl}
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

  /* ── resumable transaction found at startup ──────────────────────────── */
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

  /* ── recoverable failures ────────────────────────────────────────────── */
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
            <button
              type="button"
              onClick={() => setShowPairingFallback(true)}
              className="rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold px-4 py-3 hover:border-slate-400 hover:text-slate-800 transition"
            >
              Use a pairing code
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── idle: provider chooser ──────────────────────────────────────────── */
  const st = status as BrowserAuthStatus;
  const onProvider = (p: BrowserAuthProvider) => void startBrowserAuth(p);

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
          Your workspace, intelligently connected.
        </p>

        <div className="w-full flex flex-col gap-3 mt-9">
          <ProviderButton
            provider="google"
            isLoading={provider === "google" && st === "starting"}
            onClick={() => onProvider("google")}
            disabled={st === "starting"}
          />
          <ProviderButton
            provider="apple"
            isLoading={provider === "apple" && st === "starting"}
            onClick={() => onProvider("apple")}
            disabled={st === "starting"}
          />
          <ProviderButton
            provider="github"
            isLoading={provider === "github" && st === "starting"}
            onClick={() => onProvider("github")}
            disabled={st === "starting"}
          />
        </div>

        <div className="relative flex items-center justify-center my-6 w-full">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <span className="relative px-3 bg-[#f8fafc] text-[10px] font-mono tracking-widest text-slate-400 uppercase">or</span>
        </div>

        <button
          type="button"
          onClick={() => onProvider("email")}
          disabled={st === "starting"}
          className="w-full h-11 rounded-[8px] border border-slate-200/80 bg-white text-slate-800 font-semibold text-xs hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 disabled:opacity-40 shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40"
        >
          Continue with email
        </button>

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

        <button
          type="button"
          onClick={() => setShowPairingFallback(true)}
          className="mt-8 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
        >
          Use a pairing code instead
        </button>
      </motion.div>
    </div>
  );
}
