// Desktop browser-first authentication ("Continue with Google/Apple/GitHub/email").
//
// The webview can't complete Clerk OAuth, so authentication happens in the
// user's default browser:
//
//   1. Desktop creates a transaction server-side (PKCE code challenge only).
//   2. Desktop opens https://www.noska.me/desktop-auth?tx=…&state=… in the
//      system browser; the user signs in with any provider there.
//   3. The web page attaches its Clerk identity to the transaction and
//      bounces back via noska://auth/callback?tx=…&state=… — a one-time
//      artifact that carries NO tokens.
//   4. The desktop consumes the transaction with its PKCE verifier and gets
//      a real session. A polling loop covers the case where the OS fails to
//      route the deep link (unregistered scheme, browser hardening, …).
//
// Security properties: the verifier never leaves the desktop; the deep-link
// URL carries only the transaction id + CSRF state; the transaction is
// single-use, expires in 10 minutes, and is rejected after consumption.

import { isDesktop } from "./platform";
import { openExternal } from "./links";
import { codeChallenge, createCodeVerifier, createStateToken } from "./pkce";
import { saveSession, toIdentity, type StoredSession } from "./pairing";

export type BrowserAuthProvider = "google" | "apple" | "github" | "email";

export type BrowserAuthStatus =
  | "idle" // provider chooser
  | "starting" // creating the transaction / opening the browser
  | "waiting" // browser open, waiting for the user to finish there
  | "exchanging" // callback received, exchanging the handoff
  | "success" // signed in; app shell takes over
  | "resumable" // unfinished transaction found at startup ("Continue signing in?")
  | "expired" // transaction timed out
  | "failed" // handoff failed (e.g. callback with no matching transaction)
  | "error"; // network/backend failure

export interface BrowserAuthState {
  status: BrowserAuthStatus;
  provider: BrowserAuthProvider | null;
  /** Sign-in page in the system browser — used for open/reopen. */
  authUrl: string | null;
  /** Human-readable failure reason; never OAuth internals. */
  error: string | null;
  /** Transient polling/network problem while waiting. */
  pollError: string | null;
}

interface PendingTx {
  transactionId: string;
  verifier: string;
  state: string;
  provider: BrowserAuthProvider;
  authUrl: string;
  expiresAt: number;
}

const TX_KEY = "noska_auth_transaction";
const POLL_MS = 3000;
const WEB_ORIGIN = String(import.meta.env.VITE_NOSKA_WEB_ORIGIN ?? "https://www.noska.me").replace(/\/+$/, "");

function functionsBase(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/desktop-auth`;
}
function anonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
}

async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(functionsBase(), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey() },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string; error?: string }).message || (json as { error?: string }).error || `Sign-in service error (${res.status})`);
  return json as T;
}

/* ── tiny external store for React ─────────────────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

let state: BrowserAuthState = {
  status: "idle",
  provider: null,
  authUrl: null,
  error: null,
  pollError: null,
};

function emit(): void {
  version++;
  listeners.forEach((l) => l());
}

function setState(patch: Partial<BrowserAuthState>): void {
  state = { ...state, ...patch };
  emit();
}

export function subscribeBrowserAuth(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function browserAuthVersion(): number {
  return version;
}
export function getBrowserAuthState(): BrowserAuthState {
  return state;
}

/* ── pending transaction persistence (survives an app restart mid-login) ─ */

function readPendingTx(): PendingTx | null {
  try {
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return null;
    const tx = JSON.parse(raw) as PendingTx;
    if (!tx?.transactionId || !tx?.verifier || !tx?.state || !tx?.authUrl) return null;
    if (tx.expiresAt <= Date.now()) {
      localStorage.removeItem(TX_KEY);
      return null;
    }
    return tx;
  } catch {
    return null;
  }
}

function writePendingTx(tx: PendingTx): void {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(tx));
  } catch {}
}

function clearPendingTx(): void {
  try {
    localStorage.removeItem(TX_KEY);
  } catch {}
}

/* ── consume (exchange the handoff for a real session) ─────────────────── */

let consumeInFlight = false;

async function consumeTx(pending: PendingTx): Promise<void> {
  if (consumeInFlight) return;
  consumeInFlight = true;
  setState({ status: "exchanging", error: null, pollError: null });
  try {
    const r = await callFn<{ status: string; session?: StoredSession }>({
      action: "consume",
      transaction_id: pending.transactionId,
      code_verifier: pending.verifier,
    });
    if (r.status === "complete" && r.session?.access_token) {
      clearPendingTx();
      saveSession({
        access_token: r.session.access_token,
        sid: r.session.sid,
        expires_at: r.session.expires_at,
        refresh_secret: r.session.refresh_secret,
        identity: toIdentity(r.session.identity),
      });
      setState({ status: "success", error: null, pollError: null });
      return;
    }
    if (r.status === "expired") {
      clearPendingTx();
      setState({ status: "expired", error: "Your sign-in session expired. Please start again." });
      return;
    }
    // Not attached yet (user still in the browser) — keep waiting.
    setState({ status: "waiting" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "We couldn't complete the sign-in. Please try again.";
    setState({ status: "failed", error: msg });
  } finally {
    consumeInFlight = false;
  }
}

/* ── polling fallback (covers a failed/routed-away deep link) ──────────── */

let runId = 0;

function stopPolling(): void {
  runId++;
}

async function pollLoop(pending: PendingTx, id: number): Promise<void> {
  let consecutiveErrors = 0;
  while (Date.now() < pending.expiresAt) {
    if (id !== runId) return;
    if (state.status !== "waiting") return; // success/cancel handled elsewhere
    try {
      const r = await callFn<{ status: string; session?: StoredSession }>({
        action: "consume",
        transaction_id: pending.transactionId,
        code_verifier: pending.verifier,
      });
      if (id !== runId || state.status !== "waiting") return;
      if (r.status === "complete" && r.session?.access_token) {
        clearPendingTx();
        saveSession({
          access_token: r.session.access_token,
          sid: r.session.sid,
          expires_at: r.session.expires_at,
          refresh_secret: r.session.refresh_secret,
          identity: toIdentity(r.session.identity),
        });
        setState({ status: "success", error: null, pollError: null });
        return;
      }
      if (r.status === "expired") {
        clearPendingTx();
        setState({ status: "expired", error: "Your sign-in session expired. Please start again." });
        return;
      }
      consecutiveErrors = 0;
      setState({ pollError: null });
    } catch (e) {
      consecutiveErrors++;
      if (id !== runId) return;
      const msg = e instanceof Error ? e.message : null;
      if (consecutiveErrors >= 2) setState({ pollError: msg });
    }
    await new Promise((r2) => setTimeout(r2, POLL_MS));
  }
  if (id === runId && state.status === "waiting") {
    clearPendingTx();
    setState({ status: "expired", error: "Your sign-in session expired. Please start again." });
  }
}

/* ── public API ────────────────────────────────────────────────────────── */

export function authPageUrl(provider: BrowserAuthProvider, transactionId: string, stateToken: string): string {
  // `s`, not `state`: the web page's OAuth return appends Clerk's own
  // `state` param, which would collide with ours.
  const params = new URLSearchParams({ tx: transactionId, provider, s: stateToken });
  return `${WEB_ORIGIN}/desktop-auth?${params.toString()}`;
}

/** Starts a browser-first sign-in: creates the transaction, opens the browser. */
export async function startBrowserAuth(provider: BrowserAuthProvider): Promise<void> {
  if (!isDesktop()) return;
  if (state.status === "starting" || state.status === "waiting" || state.status === "exchanging") return;

  setState({ status: "starting", provider, error: null, pollError: null });
  try {
    const verifier = createCodeVerifier();
    const challenge = await codeChallenge(verifier);
    const stateToken = createStateToken();
    const r = await callFn<{ status: string; transaction_id: string; expires_at: string }>({
      action: "start",
      code_challenge: challenge,
    });
    const pending: PendingTx = {
      transactionId: r.transaction_id,
      verifier,
      state: stateToken,
      provider,
      authUrl: authPageUrl(provider, r.transaction_id, stateToken),
      expiresAt: new Date(r.expires_at).getTime(),
    };
    writePendingTx(pending);
    setState({ status: "waiting", authUrl: pending.authUrl });
    await openExternal(pending.authUrl).catch(() => {});
    stopPolling();
    void pollLoop(pending, runId);
  } catch (e) {
    clearPendingTx();
    setState({
      status: "error",
      error: e instanceof Error ? e.message : "Couldn't connect to Noska. Check your internet connection and try again.",
    });
  }
}

/** Re-opens the sign-in page in the system browser ("Reopen browser"). */
export async function reopenBrowser(): Promise<void> {
  if (!state.authUrl) return;
  await openExternal(state.authUrl).catch(() => {});
}

/** User-cancelled: stop waiting and invalidate the transaction server-side. */
export function cancelBrowserAuth(): void {
  const pending = readPendingTx();
  stopPolling();
  clearPendingTx();
  setState({ status: "idle", provider: null, authUrl: null, error: null, pollError: null });
  if (pending) {
    callFn({ action: "cancel", transaction_id: pending.transactionId }).catch(() => {});
  }
}

/**
 * Handles a `noska://auth/*` deep link forwarded by DesktopBridge.
 * Returns true when the URL was an auth link (consumed or rejected here).
 */
export function handleAuthCallbackUrl(raw: string): boolean {
  const parsed = parseAuthCallback(raw);
  if (!parsed) return false;

  // Duplicate/late callbacks after a successful handoff are ignored safely.
  if (state.status === "success" || state.status === "exchanging") return true;

  if (parsed.action === "cancel") {
    cancelBrowserAuth();
    return true;
  }

  const pending = readPendingTx();
  if (!pending) {
    // The app was restarted and lost the verifier, or the callback belongs
    // to another device — never trust a URL parameter as proof of sign-in.
    setState({ status: "failed", error: "We couldn't return to Noska automatically. Please start again." });
    return true;
  }
  if (parsed.transactionId !== pending.transactionId || parsed.state !== pending.state) {
    // Wrong transaction or state mismatch — treat as a foreign callback.
    return true;
  }
  void consumeTx(pending);
  return true;
}

/** Resumes an unfinished transaction found at startup ("Continue signing in?"). */
export function resumeBrowserAuth(): void {
  const pending = readPendingTx();
  if (!pending || consumeInFlight) return;
  setState({ status: "waiting", provider: pending.provider, authUrl: pending.authUrl, error: null, pollError: null });
  stopPolling();
  void pollLoop(pending, runId);
}

/** Discards an unfinished transaction ("Start over"). */
export function discardBrowserAuth(): void {
  stopPolling();
  clearPendingTx();
  setState({ status: "idle", provider: null, authUrl: null, error: null, pollError: null });
}

/** Logout: drops any pending transaction state (session clearing lives in pairing.ts). */
export function clearBrowserAuthState(): void {
  stopPolling();
  clearPendingTx();
}

/* ── deep-link parsing ─────────────────────────────────────────────────── */

export interface ParsedAuthCallback {
  action: "callback" | "cancel";
  transactionId: string | null;
  state: string | null;
}

const TX_PATTERN = /^[a-f0-9]{32}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Strict parser for auth deep links. Only these forms are accepted:
 *   noska://auth/callback?tx=<32-hex>&state=<token>
 *   noska://auth/cancel
 */
export function parseAuthCallback(raw: string): ParsedAuthCallback | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "noska:") return null;
  if (url.hostname.toLowerCase() !== "auth") return null;
  const action = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
  if (action !== "callback" && action !== "cancel") return null;

  const tx = url.searchParams.get("tx");
  const st = url.searchParams.get("state");
  if (action === "callback") {
    if (!tx || !TX_PATTERN.test(tx)) return null;
    if (!st || !STATE_PATTERN.test(st)) return null;
  }
  return { action, transactionId: tx, state: st };
}

/* ── startup detection ─────────────────────────────────────────────────── */

if (isDesktop() && readPendingTx()) {
  const pending = readPendingTx()!;
  state = { ...state, status: "resumable", provider: pending.provider, authUrl: pending.authUrl };
}
