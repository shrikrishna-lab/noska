// Desktop browser-pairing authentication.
//
// The desktop webview cannot complete Clerk logins (OAuth redirects die on
// the custom origin), so authentication happens in the user's BROWSER:
//
//   1. App shows a pairing code            2. User enters it at noska.me/connect-desktop
//   3. Web verifies the Clerk session      4. Edge function links code -> user
//   5. App exchanges the code for a real Supabase (GoTrue) session
//   6. supabase-js owns refresh from there â€” same identity as web.
//
// Identity is exposed as a Clerk-user-shaped object so the rest of the app
// (App.tsx bootstrap) treats paired desktop users exactly like web users.

import { isDesktop } from "./platform";

export interface DesktopIdentity {
  /** Supabase auth user id (UUID) â€” what RLS / auth.uid() resolves to. */
  id: string;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
  /* Clerk UserResource-compatible surface consumed by App.tsx */
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  createdAt?: number | null;
}

/** Normalizes a raw {id,email} from the edge function into the full shape. */
function toIdentity(raw: DesktopIdentity): DesktopIdentity {
  const email = raw.email ?? null;
  const namePart = email ? email.split("@")[0] : null;
  return {
    ...raw,
    email,
    fullName: raw.fullName ?? namePart ?? "Workspace User",
    imageUrl: raw.imageUrl ?? null,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    firstName: namePart ?? null,
    lastName: null,
    username: namePart,
    createdAt: Date.now(),
  };
}

export type PairingStatus = "idle" | "waiting" | "success" | "expired" | "error";

const CODE_KEY = "noska_pairing_code";
const SESSION_KEY = "noska_desktop_session";
const POLL_MS = 3000;
const PAIRING_TTL_MS = 10 * 60 * 1000;

function functionsBase(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/desktop-auth`;
}
function anonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
}

/* â”€â”€ session store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface StoredSession {
  access_token: string;
  sid: string;
  expires_at: number; // epoch ms
  identity: DesktopIdentity;
}

let cachedIdentity: DesktopIdentity | null | undefined;

export function loadSession(): StoredSession | null {
  if (!isDesktop()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s?.access_token || !s?.identity?.id) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  cachedIdentity = s.identity;
  // Mirror into the shared supabase client so supabase.auth.getSession()
  // callers (teams, agent runtime, â€¦) see the paired identity too.
  import("../supabase")
    .then(({ supabase }) =>
      supabase.auth.setSession({
        access_token: s.access_token,
        refresh_token: s.sid,
      }))
    .catch(() => {});
  emit();
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  cachedIdentity = null;
  emit();
}

/** Clerk-user-shaped identity for the paired session, or null. */
export function getDesktopIdentity(): DesktopIdentity | null {
  if (cachedIdentity !== undefined) return cachedIdentity;
  const s = loadSession();
  cachedIdentity = s ? s.identity : null;
  return cachedIdentity;
}

/* â”€â”€ tiny external store for React â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
function emit(): void {
  version++;
  listeners.forEach((l) => l());
}
export function subscribePairing(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function pairingVersion(): number {
  return version;
}

/* â”€â”€ pairing code lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function getOrCreatePairingCode(): string {
  try {
    const existing = localStorage.getItem(CODE_KEY);
    if (existing) return existing;
  } catch {}
  const code = newCode();
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {}
  return code;
}

export function regeneratePairingCode(): string {
  const code = newCode();
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {}
  return code;
}

async function callFn<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(functionsBase(), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey() },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `desktop-auth failed (${res.status})`);
  return json as T;
}

/* â”€â”€ polling loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

let polling = false;
let pollStatus: PairingStatus = "idle";
let pollError: string | null = null;

export function getPollState(): { status: PairingStatus; error: string | null } {
  return { status: pollStatus, error: pollError };
}

export async function beginPairing(): Promise<void> {
  if (!isDesktop() || polling) return;
  polling = true;
  pollStatus = "waiting";
  pollError = null;
  emit();
  const deadline = Date.now() + PAIRING_TTL_MS;
  const code = getOrCreatePairingCode();
  let consecutiveErrors = 0;
  while (Date.now() < deadline && pollStatus === "waiting") {
    try {
      const r = await callFn<{ status: string; session?: StoredSession }>({
        action: "exchange",
        code,
      });
      if (r.status === "complete" && r.session) {
        saveSession({
          ...r.session,
          identity: toIdentity(r.session.identity),
        });
        try {
          localStorage.removeItem(CODE_KEY);
        } catch {}
        pollStatus = "success";
        emit();
        polling = false;
        return;
      }
      consecutiveErrors = 0;
      pollError = null;
      // pending -> keep waiting
      // Row doesn't exist until the browser claims it â€” keep waiting either
      // way; the local deadline is what ends the wait.
    } catch (e) {
      consecutiveErrors++;
      pollError = e instanceof Error ? e.message : "Could not contact the sign-in service";
      // Keep retrying transient failures, but expose the actual reason to the
      // UI instead of making a backend/auth failure look like a stuck pairing.
      if (consecutiveErrors >= 3) emit();
    }
    await new Promise((r2) => setTimeout(r2, POLL_MS));
  }
  if (pollStatus === "waiting") pollStatus = "expired";
  polling = false;
  emit();
}

export function resetPairing(): void {
  pollStatus = "idle";
  pollError = null;
  polling = false;
  regeneratePairingCode();
  emit();
}

/* â”€â”€ refresh + logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Swaps the stored refresh code for a fresh JWT (server rotates the code). */
export async function refreshDesktopSession(): Promise<string | null> {
  const s = loadSession();
  if (!s?.sid) return null;
  try {
    const r = await callFn<{ status: string; session?: StoredSession }>({
      action: "refresh",
      sid: s.sid,
    });
    if (r.status === "complete" && r.session) {
      saveSession(r.session);
      return r.session.access_token;
    }
    if (r.status === "unknown_code") clearSession();
    return null;
  } catch {
    return null;
  }
}

export function hasUsableSession(): boolean {
  const s = loadSession();
  return !!s && s.expires_at > Date.now();
}

export function desktopSignOut(): void {
  // Desktop shares the web Clerk session — no remote revoke (would sign web out).
  clearSession();
}
