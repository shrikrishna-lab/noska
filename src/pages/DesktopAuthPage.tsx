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

// Network-level failures (DNS blips, offline moments) surface as opaque
// "Failed to fetch"; retry briefly, then translate to a human message.
const NETWORK_ERROR = "Couldn't reach the sign-in service. Check your internet connection and try again.";

async function callFnWithRetry(body: Record<string, unknown>, jwt: string, attempts = 3): Promise<Record<string, unknown>> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(json.message || json.error || "Could not complete the sign-in."), { status: res.status, json });
      return json;
    } catch (e) {
      lastError = e;
      if ((e as { status?: number }).status) throw e; // real server answer
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  console.warn("desktop-auth attach: network retries exhausted", lastError);
  throw new Error(NETWORK_ERROR);
}

type OAuthProvider = "google" | "apple" | "github";

export default function DesktopAuthPage() {
  const { isLoaded, isSignedIn, getToken, sessionId } = useAuth();
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
        // The "supabase" JWT template is the only token Supabase's GoTrue
        // verifier accepts on this Clerk instance (default session tokens are
        // RS256-signed and rejected). The template carries no sid claim, so
        // the session id travels in the body and is verified server-side
        // against the Clerk Backend API.
        const jwt = await getToken({ template: "supabase" });
        if (!jwt) throw new Error("Not signed in");
        const json = await callFnWithRetry(
          { action: "attach", transaction_id: tx, sid: sessionId ?? undefined },
          jwt
        );
        if (json.status !== "attached") {
          throw new Error((json.message as string) || "This sign-in request is no longer valid.");
        }
        setPhase("complete");
      } catch (e) {
        setPhase("error");
        setErrorMessage(e instanceof Error ? e.message : "Could not complete the sign-in.");
        attached.current = false; // allow retry (e.g. transient network)
      }
    })();
  }, [isLoaded, isSignedIn, validTx, tx, sessionId, getToken]);

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
      </div>

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
