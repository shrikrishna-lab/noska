// Desktop pairing screen — replaces the login form in the installed app.
// Shows a code; the user confirms ownership at noska.me/connect-desktop in
// their browser, and the app exchanges the code for a real session.

import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
  beginPairing,
  getOrCreatePairingCode,
  getPollState,
  pairingVersion,
  resetPairing,
  subscribePairing,
} from "../../lib/desktop/pairing";

const CONNECT_URL = "https://www.noska.me/connect-desktop";

export default function PairingScreen() {
  const navigate = useNavigate();
  useSyncExternalStore(subscribePairing, pairingVersion);
  const [copied, setCopied] = useState(false);
  const code = getOrCreatePairingCode();
  const { status } = getPollState();

  useEffect(() => {
    beginPairing();
  }, []);

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 900);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-md text-center">
        <img src="/logo.png" alt="Noska" className="h-14 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-900">Sign in to Noska</h1>
        <p className="text-sm text-slate-500 mt-2">
          Enter this code in your browser to link your account.
        </p>

        <div className="my-8">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(code).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="font-mono text-4xl font-bold tracking-[0.2em] text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-8 py-5 hover:border-slate-400 transition"
            title="Click to copy"
          >
            {code}
          </button>
          <p className="text-xs text-slate-400 mt-3 h-4">{copied ? "Copied!" : ""}</p>
        </div>

        {status === "waiting" && (
          <p className="text-sm text-slate-600 animate-pulse" data-testid="pairing-waiting">
            Waiting for confirmation in your browser…
          </p>
        )}
        {status === "success" && (
          <p className="text-sm text-emerald-600 font-medium" data-testid="pairing-success">
            Linked! Opening your workspace…
          </p>
        )}
        {(status === "expired" || status === "error") && (
          <div className="text-sm text-red-500 mb-4">
            Code expired. Generate a new one and try again.
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mt-6">
          <a
            href={`${CONNECT_URL}?code=${encodeURIComponent(code)}`}
            onClick={(e) => {
              e.preventDefault();
              import("../../lib/desktop/links").then(({ openExternal }) =>
                openExternal(`${CONNECT_URL}?code=${encodeURIComponent(code)}`).catch(() => {})
              );
            }}
            className="rounded-lg bg-slate-800 text-white text-xs font-semibold px-5 py-3 hover:bg-slate-700 transition"
          >
            Open noska.me/connect-desktop
          </a>
          <button
            type="button"
            onClick={() => resetPairing()}
            className="rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold px-4 py-3 hover:border-slate-400 transition"
          >
            New code
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-8">
          Codes expire after 10 minutes and can only be used once.
        </p>
      </div>
    </div>
  );
}
