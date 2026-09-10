import React, { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronRight, Copy, X } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";
import { supabase } from "../../../lib/supabase";
import { uid } from "../../../utils/helpers";

export default function InviteStep() {
  const { form, setFormField, next, back } = useOnboarding();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const teammates = form.teammates || [];

  // Stable invite code — persisted in form state so it survives remounts
  // and is available during onboarding finalization.
  const inviteCode = useRef<string | null>(null);
  if (!inviteCode.current) {
    inviteCode.current = (form.inviteCode || uid().replace(/-/g, "").slice(0, 12).toUpperCase());
    if (!form.inviteCode) {
      queueMicrotask(() => setFormField("inviteCode", inviteCode.current!));
    }
  }

  // Persist the invite code in the database (idempotent, runs once)
  const persistInviteCode = useCallback(async () => {
    const code = inviteCode.current;
    if (!code) return;
    try {
      const user = (window as any).realtimeCollab as any;
      const userId = user?.getUser?.()?.userId || localStorage.getItem("noska_user_id");
      const userName = user?.getUser?.()?.userName || "New User";
      if (!userId) return;
      await supabase.rpc("create_user_invite_code" as never, {
        p_code: code,
        p_user_id: userId,
        p_user_name: userName,
      } as never);
    } catch (e) {
      // Non-critical — code is still valid client-side
    }
  }, []);

  // Persist once on mount
  useEffect(() => { persistInviteCode(); }, []);

  const add = () => {
    const t = email.trim();
    if (!t || !t.includes("@") || teammates.some((m) => m.email === t)) return;
    setFormField("teammates", [...teammates, { id: uid(), email: t }]);
    setEmail("");
  };

  const remove = (id) => setFormField("teammates", teammates.filter((m) => m.id !== id));

  const codeStr = inviteCode.current || "";

  const copyLink = () => {
    const link = `${window.location.origin}/invite/${codeStr}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    persistInviteCode();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Invite your teammates</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>Noska is better together. Invite the people you work with.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="colleague@company.com"
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-[#9a9ab0] transition-all duration-200"
            style={{ background: "#fff", border: `1.5px solid ${C.border}`, color: C.text }}
            onFocus={(e) => { e.currentTarget.style.border = `1.5px solid ${C.purple}`; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.border = `1.5px solid ${C.border}`; e.currentTarget.style.boxShadow = "none"; }}
          />
          <button
            onClick={add}
            disabled={!email.trim() || !email.includes("@")}
            className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
            style={{ background: "#fff", border: `1.5px solid ${C.border}`, color: C.text }}
          >
            Invite
          </button>
        </div>

        {teammates.length > 0 && (
          <div className="flex flex-col gap-0.5 p-1.5 rounded-xl" style={{ border: `1px solid ${C.border}` }}>
            {teammates.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg group transition-colors hover:bg-black/5"
                style={{ animation: `fadeSlideIn 0.25s ease ${i * 40}ms both` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: `linear-gradient(135deg,${C.purple},#4f46e5)` }}
                  >
                    {t.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm" style={{ color: C.text }}>{t.email}</span>
                </div>
                <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-black/5">
                  <X size={12} style={{ color: C.muted }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs" style={{ color: C.muted }}>Or share your invite link</p>
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: C.gray, border: `1px solid ${C.border}` }}>
            <span className="text-xs flex-1 truncate font-mono" style={{ color: C.muted }}>
              {window.location.host}/invite/{codeStr}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-semibold transition-all"
              style={{ color: copied ? C.purple : C.muted }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <div className="flex items-center gap-2">
          <SecondaryBtn onClick={next}>Skip</SecondaryBtn>
          <PrimaryBtn onClick={next}>Continue <ChevronRight size={15} /></PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
