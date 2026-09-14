// Mobile sign-in screen. The iOS/Android webview cannot complete Clerk
// OAuth (origin allow-list), so — exactly like the desktop shell — sign-in
// happens in the system browser and the app receives a one-time handoff via
// noska://auth/callback. Reuses the entire browserAuth transaction engine.

import { useSyncExternalStore } from "react";
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
import { openExternal } from "../../lib/desktop/links";
import { hapticFeedback } from "../index";

const TERMS_URL = "https://www.noska.me/terms";
const PRIVACY_URL = "https://www.noska.me/privacy";

export default function MobileAuthScreen() {
  useSyncExternalStore(subscribeBrowserAuth, browserAuthVersion);
  const { status, authUrl, error, pollError } = getBrowserAuthState();

  // Dev-only local sign-in. isDevBypassAvailable() is false in production
  // builds, so every bypass button below is removed from the shipped app.
  const devBypass = isDevBypassAvailable();
  const handleSkipAuth = () => {
    hapticFeedback("medium");
    devSignInLocal("Mobile Tester");
  };

  if (status === "success") {
    return (
      <div className="mobile-auth-screen mobile-auth-screen--center">
        <img src="/logo.png" alt="Noska" className="mobile-auth-logo" />
        <h1 className="mobile-auth-title">Signed in</h1>
        <div className="mobile-auth-loading">
          <span className="mobile-spinner" aria-hidden />
          <p>Loading your workspace…</p>
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
          : "Waiting for sign-in…";
    return (
      <div className="mobile-auth-screen mobile-auth-screen--center" data-testid="mobile-auth-waiting">
        <img src="/logo.png" alt="Noska" className="mobile-auth-logo" />
        <h1 className="mobile-auth-title">Finish in your browser</h1>
        <p className="mobile-auth-subtitle">
          We've opened your browser to sign in securely. Noska will reopen automatically.
        </p>
        <div className="mobile-auth-loading">
          <span className="mobile-spinner" aria-hidden />
          <p aria-live="polite">{pollError ?? message}</p>
        </div>
        <div className="mobile-auth-actions">
          {status === "waiting" && (
            <button
              type="button"
              className="mobile-btn mobile-btn--secondary"
              onClick={() => { hapticFeedback("light"); void reopenBrowser(); }}
              disabled={!authUrl}
            >
              Reopen browser
            </button>
          )}
          <button
            type="button"
            className="mobile-btn mobile-btn--ghost"
            onClick={() => { hapticFeedback("light"); cancelBrowserAuth(); }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (status === "resumable") {
    return (
      <div className="mobile-auth-screen mobile-auth-screen--center" data-testid="mobile-auth-resumable">
        <img src="/logo.png" alt="Noska" className="mobile-auth-logo" />
        <h1 className="mobile-auth-title">Continue signing in?</h1>
        <p className="mobile-auth-subtitle">
          You started signing in earlier but it didn't finish.
        </p>
        <div className="mobile-auth-actions" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
          <button
            type="button"
            className="mobile-btn mobile-btn--primary"
            onClick={() => { hapticFeedback("light"); resumeBrowserAuth(); void reopenBrowser(); }}
          >
            Continue signing in
          </button>
          {devBypass && (
          <button
            type="button"
            className="mobile-btn mobile-btn--secondary"
            onClick={handleSkipAuth}
          >
            Skip & Open Dev Workspace
          </button>
          )}
          <button
            type="button"
            className="mobile-btn mobile-btn--ghost"
            onClick={() => discardBrowserAuth()}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (status === "expired" || status === "failed" || status === "error") {
    const title =
      status === "expired"
        ? "Sign-in session expired"
        : status === "error"
          ? "Couldn't reach Noska"
          : "Couldn't return to Noska";
    return (
      <div className="mobile-auth-screen mobile-auth-screen--center" data-testid="mobile-auth-error">
        <img src="/logo.png" alt="Noska" className="mobile-auth-logo" />
        <h1 className="mobile-auth-title">{title}</h1>
        <p className="mobile-auth-subtitle">
          {status === "expired"
            ? "Sign-in attempts are valid for 10 minutes."
            : error ?? "Check your connection and try again."}
        </p>
        <div className="mobile-auth-actions" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
          <button
            type="button"
            className="mobile-btn mobile-btn--primary"
            onClick={() => { hapticFeedback("light"); discardBrowserAuth(); }}
          >
            Try again
          </button>
          {devBypass && (
          <button
            type="button"
            className="mobile-btn mobile-btn--secondary"
            onClick={handleSkipAuth}
          >
            Skip & Open Dev Workspace
          </button>
          )}
        </div>
      </div>
    );
  }

  // Idle — single entry point, mirroring the desktop QuickLink flow.
  return (
    <div className="mobile-auth-screen mobile-auth-screen--center" data-testid="mobile-auth-idle">
      <div className="mobile-auth-logo-wrap">
        <img src="/logo.png" alt="Noska" className="mobile-auth-logo" />
      </div>
      <h1 className="mobile-auth-title">Welcome to Noska</h1>
      <p className="mobile-auth-subtitle">
        Your workspace — pages, tasks and AI — right on your phone.
      </p>
      <button
        type="button"
        className="mobile-btn mobile-btn--primary mobile-auth-cta"
        onClick={() => { hapticFeedback("medium"); void startBrowserAuth("web"); }}
      >
        Sign in
      </button>
      {devBypass && (
      <button
        type="button"
        className="mobile-btn mobile-btn--secondary"
        style={{ marginTop: 12, width: "100%", maxWidth: 320 }}
        onClick={handleSkipAuth}
      >
        Skip for now (Dev preview)
      </button>
      )}
      {error && <p className="mobile-auth-error" role="alert">{error}</p>}
      <div className="mobile-auth-legal">
        <a href={TERMS_URL} onClick={(e) => { e.preventDefault(); void openExternal(TERMS_URL); }}>Terms</a>
        <span>·</span>
        <a href={PRIVACY_URL} onClick={(e) => { e.preventDefault(); void openExternal(PRIVACY_URL); }}>Privacy</a>
      </div>
    </div>
  );
}
