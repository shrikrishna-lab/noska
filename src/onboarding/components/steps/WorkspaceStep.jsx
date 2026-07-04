import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C } from "../../theme";
import { WORKSPACE_ICONS } from "../../data";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";
import FieldInput from "../FieldInput";

export default function WorkspaceStep() {
  const { form, setFormField, next, back } = useOnboarding();
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Name your workspace</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
          This is the name of your company, team, or organization.
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5" ref={ref}>
          <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
            Workspace icon
          </label>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm"
            style={{
              background: "#fff",
              color: C.text,
              border: showPicker ? `1.5px solid ${C.purple}` : `1.5px solid ${C.border}`,
              boxShadow: showPicker ? "0 0 0 3px rgba(124,58,237,0.1)" : "none",
            }}
          >
            <span className="text-2xl leading-none">{form.workspaceIcon}</span>
            <span style={{ color: C.muted }}>Change icon</span>
            <ChevronDown
              size={13}
              className={`ml-auto transition-transform duration-200 ${showPicker ? "rotate-180" : ""}`}
              style={{ color: C.muted }}
            />
          </button>
          {showPicker && (
            <div
              className="p-3 bg-white rounded-2xl flex flex-wrap gap-1.5 shadow-xl mt-1"
              style={{ border: `1px solid ${C.border}`, animation: "scaleIn 0.15s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}
            >
              {WORKSPACE_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => { setFormField("workspaceIcon", icon); setShowPicker(false); }}
                  className="w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: form.workspaceIcon === icon ? C.beige : C.gray,
                    border: form.workspaceIcon === icon ? `1.5px solid ${C.beigeDark}` : "1.5px solid transparent",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
        <FieldInput
          label="Workspace name"
          value={form.workspaceName}
          onChange={(v) => setFormField("workspaceName", v)}
          placeholder="Acme Inc."
          hint="You can always change this later in settings."
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && form.workspaceName.trim()) next(); }}
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <PrimaryBtn onClick={next} disabled={!form.workspaceName.trim()}>
          Continue <ChevronRight size={15} />
        </PrimaryBtn>
      </div>
    </div>
  );
}
