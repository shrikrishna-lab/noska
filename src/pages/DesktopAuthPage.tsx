// Web side of the desktop browser-handoff sign-in (noska.me/desktop-auth).
//
// The Noska desktop app opens THIS page in the user's default browser with
// a transaction id (?tx=…) and a CSRF token (?s=…). The user signs in here
// with any provider (or email) — the real OAuth happens against Clerk on
// the web origin, where redirects work. Once a session exists, the page
// "attaches" the identity to the transaction server-side and bounces back
// into the desktop app via noska://auth/callback?tx=…&state=….
//
// The URL never carries tokens; the one-time transaction artifact is
// useless to the browser without the PKCE verifier held by the desktop.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { motion } from "framer-motion";
import ProviderButton from "../components/auth/ProviderButton";
import { capture } from "../lib/posthog";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/desktop-auth`;
const TX_PATTERN = /^[a-f0-9]{32}$/;

type Phase = "authenticating" | "attaching" | "complete" | "error";

type OAuthProvider = "google" | "apple" | "github";

export default function DesktopAuthPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [params] = useSearchParams();

  const tx = params.get("tx") ?? "";
  // Desktop builds built before v1.0.9 send the CSRF token as `state`; newer
  // builds use `s` (Clerk appends its own `state` param on OAuth returns, so
  // `s` avoids the collision). Accept both, prefer `s`.
  const csrf = params.get("s") ?? params.get("state") ?? "";
  const initialProvider = params.get("provider");
  const oauthReturn = !!params.get("code");

  const validTx = TX_PATTERN.test(tx) && /^[A-Za-z0-9_-]{16,128}$/.test(csrf);

  const [phase, setPhase] = useState<Phase>("authenticating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState(initialProvider === "email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [busy, setBusy] = useState(false);

  const oauthHandled = useRef(false);
  const attached = useRef(false);

  /* ── completing an OAuth return ───────────────────────────────────────── */

  useEffect(() => {
    if (!isLoaded || oauthHandled.current) return;
    if (!oauthReturn || isSignedIn) return;
    oauthHandled.current = true;
    clerk.handleRedirectCallback({}).catch((e: unknown) => {
      setPhase("error");
      setErrorMessage(e instanceof Error ? e.message : "Authentication failed. Please try again.");
    });
  }, [isLoaded, isSignedIn, oauthReturn, clerk]);

  /* ── attach once a session exists ─────────────────────────────────────── */

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !validTx || attached.current) return;
    attached.current = true;
    (async () => {
      setPhase("attaching");
      try {
        const jwt = await getToken();
        if (!jwt) throw new Error("Not signed in");
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          },
          body: JSON.stringify({ action: "attach", transaction_id: tx }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.status !== "attached") {
          throw new Error(json.message || json.error || "This sign-in request is no longer valid.");
        }
        setPhase("complete");
      } catch (e) {
        setPhase("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not complete the sign-in.");
        attached.current = false; // allow retry (e.g. transient network)
      }
    })();
  }, [isLoaded, isSignedIn, validTx, tx, getToken]);

  /* ── automatic desktop handoff (fallback button below) ────────────────── */

  const callbackUrl = `noska://auth/callback?tx=${tx}&state=${encodeURIComponent(csrf)}`;

  useEffect(() => {
    if (phase !== "complete") return;
    const t = setTimeout(() => {
      try {
        window.location.assign(callbackUrl);
      } catch {}
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, callbackUrl]);

  /* ── provider / email sign-in ─────────────────────────────────────────── */

  // The bundled Clerk types narrow `clerk.signIn`/`authenticateWithRedirect`
  // out of LoadedClerk; mirror AuthPage's runtime-shaped access instead.
  interface ClerkSignInLike {
    create(params: Record<string, unknown>): Promise<unknown>;
    firstFactorVerification?: { externalVerificationRedirectURL?: URL | string | null };
    status?: string;
    password(params: { identifier: string; password: string }): Promise<{ error?: { message?: string } | null }>;
    mfa: {
      verifyTOTP(params: { code: string }): Promise<{ error?: Error } | null>;
      verifyEmailCode(params: { code: string }): Promise<{ error?: Error } | null>;
      verifyBackupCode(params: { code: string }): Promise<{ error?: Error } | null>;
    };
  }
  const client = clerk as unknown as {
    signIn: ClerkSignInLike;
    authenticateWithRedirect?: (params: Record<string, unknown>) => Promise<void>;
  };

  const startOAuth = async (provider: OAuthProvider) => {
    setErrorMessage(null);
    setBusy(true);
    capture("signup_started");
    if (provider === "google") capture("google_login");
    try {
      const strategy =
        provider === "github" ? "oauth_github" : provider === "apple" ? "oauth_apple" : "oauth_google";
      // Return to this page with the transaction context intact; Clerk adds
      // its own ?code=&state= params, which the effect above consumes.
      const redirectUrl = `${window.location.origin}/desktop-auth?tx=${tx}&s=${encodeURIComponent(csrf)}&provider=${provider}`;
      // Primary path: start the OAuth sign-in and jump to the provider,
      // keeping the custom Noska UI (same approach as AuthPage).
      try {
        await client.signIn.create({ strategy, redirectUrl });
        const external = client.signIn.firstFactorVerification?.externalVerificationRedirectURL;
        if (external) {
          window.location.assign(external.toString());
          return;
        }
        window.location.assign(redirectUrl);
        return;
      } catch {
        // fall through to the one-call helper
      }
      if (client.authenticateWithRedirect) {
        await client.authenticateWithRedirect({ strategy, redirectUrl, redirectUrlComplete: redirectUrl });
        return;
      }
      throw new Error("This browser couldn't start the sign-in. Please try again.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to sign in. Please try again.");
      setBusy(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setBusy(true);
    capture("signup_started");
    try {
      const si = client.signIn;
      if (needsMfa) {
        // Mirror AuthPage's MFA handling: try the authenticator first, then
        // an emailed code, then a backup code.
        const result =
          (await si.mfa.verifyTOTP({ code: mfaCode }).catch(() => null)) ??
          (await si.mfa.verifyEmailCode({ code: mfaCode }).catch(() => null)) ??
          (await si.mfa.verifyBackupCode({ code: mfaCode }).catch(() => null));
        if (result?.error) throw result.error;
      } else {
        const { error: passwordError } = await si.password({ identifier: email, password });
        if (passwordError) throw passwordError;
      }
      if (si.status === "needs_second_factor" || si.status === "needs_client_trust") {
        setNeedsMfa(true);
        setBusy(false);
        return;
      }
      // si.status === "complete" → isSignedIn flips and the attach effect
      // above finishes the flow.
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ── render ───────────────────────────────────────────────────────────── */

  if (!validTx) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-slate-900 text-center">Invalid sign-in link</h1>
        <p className="text-sm text-slate-500 mt-3 text-center">
          This page is only used to sign in to the Noska desktop app. Start the sign-in from the Noska app.
        </p>
        <a href="/" className="mt-6 inline-block text-xs font-semibold text-slate-500 hover:text-slate-800 transition">Go to noska.me</a>
      </Shell>
    );
  }

  if (phase === "complete") {
    const displayName = user?.firstName ?? "";
    return (
      <Shell data-testid="desktop-auth-complete">
        <h1 className="text-xl font-bold text-slate-900 text-center">You're signed in.</h1>
        <p className="text-sm text-slate-500 mt-3 text-center">
          {displayName ? `Welcome${displayName ? `, ${displayName}` : ""}. ` : ""}
          Return to the Noska app to continue.
        </p>
        <div className="flex items-center justify-center mt-8 mb-2" aria-hidden>
          <motion.span
            className="block h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-700"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
          />
        </div>
        <p className="text-xs text-slate-400 text-center">Opening Noska Desktop…</p>
        <button
          type="button"
          onClick={() => { try { window.location.assign(callbackUrl); } catch {} }}
          className="mt-6 w-full h-11 rounded-[8px] bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition disabled:opacity-40"
        >
          Open Noska Desktop
        </button>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Didn't work? Make sure Noska is installed and running.
        </p>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell data-testid="desktop-auth-web-error">
        <h1 className="text-lg font-bold text-slate-900 text-center">Sign-in failed</h1>
        <p className="text-sm text-slate-500 mt-3 text-center">{errorMessage}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 w-full h-11 rounded-[8px] bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
        >
          Try again
        </button>
      </Shell>
    );
  }

  if (phase === "attaching" || isSignedIn) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-slate-900 text-center">Completing sign-in…</h1>
        <div className="flex items-center justify-center mt-8" aria-hidden>
          <motion.span
            className="block h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-700"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
          />
        </div>
      </Shell>
    );
  }

  return (
    <Shell data-testid="desktop-auth-web">
      <p className="text-[10px] font-mono tracking-[0.3em] text-slate-400 uppercase text-center">Noska</p>
      <h1 className="text-xl font-bold text-slate-900 text-center mt-3">Sign in to Noska Desktop</h1>
      <p className="text-sm text-slate-500 mt-2 text-center">
        Finish signing in here — the app will open automatically.
      </p>

      {!emailMode && (
        <div className="w-full flex flex-col gap-3 mt-7">
          <ProviderButton
            provider="google"
            isLoading={busy && initialProvider === "google"}
            onClick={() => void startOAuth("google")}
            disabled={busy}
          />
          <ProviderButton
            provider="apple"
            isLoading={busy && initialProvider === "apple"}
            onClick={() => void startOAuth("apple")}
            disabled={busy}
          />
          <ProviderButton
            provider="github"
            isLoading={busy && initialProvider === "github"}
            onClick={() => void startOAuth("github")}
            disabled={busy}
          />
          <div className="relative flex items-center justify-center my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <span className="relative px-3 bg-[#f8fafc] text-[10px] font-mono tracking-widest text-slate-400 uppercase">or</span>
          </div>
          <button
            type="button"
            onClick={() => setEmailMode(true)}
            disabled={busy}
            className="w-full h-11 rounded-[8px] border border-slate-200/80 bg-white text-slate-800 font-semibold text-xs hover:border-slate-300 hover:bg-slate-50 transition disabled:opacity-40 shadow-sm"
          >
            Continue with email
          </button>
        </div>
      )}

      {emailMode && (
        <form onSubmit={submitPassword} className="w-full flex flex-col gap-3 mt-7">
          {needsMfa ? (
            <>
              <p className="text-xs text-slate-500 text-center">Enter your verification code to continue.</p>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="Verification code"
                autoComplete="one-time-code"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full h-11 px-3 rounded-[8px] border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-[8px] bg-slate-800 text-white text-xs font-semibold transition hover:bg-slate-700 disabled:opacity-40"
          >
            {busy ? "Signing in…" : needsMfa ? "Verify and continue" : "Continue"}
          </button>
          {!needsMfa && (
            <button
              type="button"
              onClick={() => setEmailMode(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Use a social account instead
            </button>
          )}
        </form>
      )}

      {errorMessage && <p className="text-xs text-red-500 text-center mt-4" role="alert">{errorMessage}</p>}

      <p className="text-xs text-slate-400 mt-10 text-center">Terms · Privacy</p>
    </Shell>
  );
}

function Shell({ children, ...rest }: { children: React.ReactNode; "data-testid"?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6 font-sans select-none">
      <div className="w-full max-w-[360px] flex flex-col items-center" {...rest}>
        <div className="w-14 h-14 mb-7 bg-white border border-slate-200/80 flex items-center justify-center p-3 shrink-0 rounded-2xl shadow-lg">
          <img src="/logo.png" alt="Noska Logo" className="w-full h-full object-contain pointer-events-none select-none" />
        </div>
        {children}
      </div>
    </div>
  );
}
