// Web side of desktop pairing: the signed-in user enters the code shown in
// the Noska desktop app; we link it to their Clerk identity server-side.
//
// Zero-click paths:
//  - Arriving signed-in with ?code=â€¦ links immediately.
//  - Arriving signed-out embeds the normal login UI; the moment a session
//    exists (anywhere in the app), the pending code is claimed automatically
//    via PairClaimWatcher â€” surviving the redirect into the workspace.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import AuthPage from "../components/auth/AuthPage";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/desktop-auth`;
const PENDING_KEY = "noska_pending_pair_code";
const PENDING_TS_KEY = "noska_pending_pair_ts";
const PENDING_MAX_AGE_MS = 3 * 60 * 1000;

export function parkPendingCode(code: string) {
  sessionStorage.setItem(PENDING_KEY, code);
  sessionStorage.setItem(PENDING_TS_KEY, String(Date.now()));
}

function popPendingCode(): string | null {
  const ts = Number(sessionStorage.getItem(PENDING_TS_KEY) || 0);
  const code = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_TS_KEY);
  if (!code) return null;
  if (!ts || Date.now() - ts > PENDING_MAX_AGE_MS) return null;
  return code;
}

function isValidPairCode(c: string): boolean {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c);
}

export async function claimPairCode(code: string, jwt: string): Promise<void> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify({ action: "claim", code }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = json.error || "";
    if (reason === "code_not_active") throw new Error("This code isn't active. Open the Noska desktop app and use its current code.");
    if (reason === "code_used") throw new Error("This code was already used. Click 'New code' in the app and retry.");
    if (reason === "code_expired") throw new Error("This code expired. Click 'New code' in the app and retry.");
    throw new Error(json.message || "Could not link this code");
  }
      // Hand the user straight back to the installed app â€” the OS routes
      // noska:// to it, the single-instance handler focuses the window, and
      // its poller completes the session within ~3s.
      try { window.location.assign("noska://pair-complete"); } catch {}
}

/**
 * Mounted globally (main.tsx). Whenever a Clerk session exists and a pairing
 * code is parked in sessionStorage, claims it once â€” even if the user has
 * already been routed into their workspace after logging in.
 */
export function PairClaimWatcher() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const tried = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || tried.current) return;
    const code = sessionStorage.getItem(PENDING_KEY);
    if (!code) return;
    tried.current = true;
    (async () => {
      try {
        const jwt = await getToken({ template: 'supabase' });
        if (!jwt) throw new Error("no token");
        await claimPairCode(code, jwt);
        window.dispatchEvent(new CustomEvent("noska:pair-claimed", { detail: code }));
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        tried.current = false; // allow retry on next auth change
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}

function friendly(err: Error): string {
  if (/failed to fetch|networkerror|load failed|internet/i.test(err.message)) {
    return "The request was blocked before it reached Noska. Disable ad-blockers/VPN for this page and try again.";
  }
  return err.message;
}

export default function DesktopConnectPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [params] = useSearchParams();
  const urlCode = (params.get("code") || "").toUpperCase();
  const [code, setCode] = useState(isValidPairCode(urlCode) ? urlCode : "");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const autoTried = useRef(false);

  // Park the code so the global watcher can claim it after any login redirect.
  useEffect(() => {
    if (isValidPairCode(urlCode)) parkPendingCode(urlCode);
  }, [urlCode]);

  // Signed-in visitors: auto-link URL-provided codes (zero click).
  useEffect(() => {
    if (!isLoaded || !isSignedIn || autoTried.current) return;
    if (!isValidPairCode(urlCode)) return;
    autoTried.current = true;
    setState("working");
    (async () => {
      try {
        const jwt = await getToken({ template: 'supabase' });
        if (!jwt) throw new Error("Not signed in");
        await claimPairCode(urlCode, jwt);
        sessionStorage.removeItem(PENDING_KEY);
        setState("done");
      } catch (err) {
        setState("error");
        setMessage(friendly(err as Error));
      }
    })();
  }, [isLoaded, isSignedIn, urlCode, getToken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!isValidPairCode(clean)) {
      setState("error");
      setMessage("Codes look like ABCD-1234.");
      return;
    }
    setState("working");
    try {
      const jwt = await getToken({ template: 'supabase' });
      if (!jwt) throw new Error("Not signed in");
      await claimPairCode(clean, jwt);
      sessionStorage.removeItem(PENDING_KEY);
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(friendly(err as Error));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-sm">
        <img src="/logo.png" alt="Noska" className="h-12 mx-auto mb-6" />
        <h1 className="text-xl font-bold text-slate-900 text-center">Connect Noska Desktop</h1>

        {!isLoaded && (
          <p className="text-center text-sm text-slate-500 mt-6">Checking sign-inâ€¦</p>
        )}

        {/* Signed out: run the normal login UI right here. Once any session
            exists, PairClaimWatcher links the parked code automatically. */}
        {isLoaded && !isSignedIn && (
          <div className="mt-6">
            <AuthPage onAuthSuccess={() => {}} />
          </div>
        )}

        {isLoaded && isSignedIn && state !== "done" && (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              autoFocus={!isValidPairCode(urlCode)}
              className="font-mono text-center text-2xl tracking-[0.2em] h-14 rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={state === "working"}
              className="h-11 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-40"
            >
              {state === "working" ? "Linkingâ€¦" : "Link desktop app"}
            </button>
            {state === "error" && <p className="text-xs text-red-500 text-center">{message}</p>}
          </form>
        )}

        {state === "done" && (
          <p className="mt-6 text-center text-sm text-emerald-600 font-medium">
            Linked! Your desktop app will open your workspace in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
