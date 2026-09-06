import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseAnon } from "../../lib/supabase";
import { motion } from "framer-motion";
import AuthBackground from "../../components/auth/AuthBackground";

type CheckState = "idle" | "checking" | "invalid" | "used" | "expired";

// /code lets someone who received an invite code (but lost or never got the
// button link) redeem it manually. Valid codes forward to /invite/:code,
// which owns the actual sign-up flow.
export function EnterCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [state, setState] = useState<CheckState>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned || !supabaseAnon || state === "checking") return;
    setState("checking");
    try {
      const { data, error } = await supabaseAnon
        .rpc("get_invite_by_code" as never, { p_code: cleaned } as never) as never as { data: Record<string, unknown> | null; error: unknown };
      if (error || !data) { setState("invalid"); return; }
      if (data.status === "accepted") { setState("used"); return; }
      const expiresAt = data.invite_expires_at as string | null | undefined;
      if (expiresAt && new Date(expiresAt) < new Date()) { setState("expired"); return; }
      if (data.status === "expired") { setState("expired"); return; }
      navigate(`/invite/${cleaned}`, { replace: true });
    } catch {
      setState("invalid");
    }
  };

  const errorMessage: Record<Exclude<CheckState, "idle" | "checking">, string> = {
    invalid: "That code doesn't exist or isn't valid. Double-check the email you received.",
    used: "This code has already been used. Sign in to access your workspace.",
    expired: "This code has expired. Please request a new one.",
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-40 overflow-hidden font-sans select-none">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-[360px] px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex flex-col items-center w-full"
        >
          <div className="w-16 h-16 mb-8 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg animate-pulse-subtle">
            <img
              src="/logo.png"
              alt="Noska Logo"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-slate-800">Enter your invite code</h1>
            <p className="mt-1 text-sm text-slate-500">Paste the code from your invitation email.</p>
          </div>

          {state !== "idle" && state !== "checking" && (
            <div className="w-full mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600 text-center">
              {errorMessage[state]}
              {state === "used" && (
                <>
                  {" "}
                  <a href="/login" className="font-medium underline">Sign in</a>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); if (state !== "idle") setState("idle"); }}
              placeholder="XXXXXXXX"
              autoFocus
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 text-center text-sm font-semibold tracking-[0.2em] uppercase text-slate-800 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
            <button
              type="submit"
              disabled={!code.trim() || state === "checking"}
              className="w-full h-11 rounded-lg bg-violet-600 text-white text-sm font-medium transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "checking" ? "Checking…" : "Continue"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <a href="/login" className="text-slate-600 font-medium hover:underline">Sign in</a>
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            By continuing, you agree to Noska's Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
