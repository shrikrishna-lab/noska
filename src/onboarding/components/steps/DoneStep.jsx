import React from "react";
import { Check, Sparkles } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";

const QUICK_ACTIONS = [
  { icon: "📝", label: "Write a page" },
  { icon: "📊", label: "Create a database" },
  { icon: "🤝", label: "Invite team" },
];

export default function DoneStep() {
  const { form, complete } = useOnboarding();
  const workspaceName = form.workspaceName?.trim() || "Your workspace";

  return (
    <div className="flex flex-col items-center text-center gap-9">
      <div className="flex flex-col items-center gap-6">
        <div className="relative" style={{ animation: "bounceIn 0.5s ease" }}>
          <div
            className="w-[76px] h-[76px] rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg,${C.purple},#4f46e5)`, boxShadow: "0 12px 40px rgba(124,58,237,0.35)" }}
          >
            {form.workspaceIcon}
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
            style={{ background: "#22c55e", animation: "popIn 0.4s 0.3s ease both" }}
          >
            <Check size={12} strokeWidth={3} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>
            {workspaceName} is ready 🎉
          </h2>
          <p className="text-sm leading-relaxed max-w-[300px]" style={{ color: C.muted }}>
            You're all set. Start building something extraordinary with Noska.
          </p>
        </div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ icon, label }, i) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-200 hover:shadow-md group"
              style={{ background: "#fff", border: `1.5px solid ${C.border}`, animation: `fadeSlideIn 0.3s ease ${i * 80 + 300}ms both` }}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs leading-tight transition-colors" style={{ color: C.muted }}>{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={complete}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          style={{ background: C.beige, color: "#5a3e20" }}
        >
          <Sparkles size={16} />
          Open {workspaceName}
        </button>
      </div>
    </div>
  );
}
