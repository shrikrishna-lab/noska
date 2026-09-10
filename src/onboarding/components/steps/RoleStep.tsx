import React from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { C } from "../../theme";
import { ROLES, USE_CASES } from "../../data";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";

export default function RoleStep() {
  const { form, setFormField, next, back } = useOnboarding();

  const toggleUseCase = (id: string) => {
    const current = form.useCase || [];
    setFormField("useCase", current.includes(id) ? current.filter((u) => u !== id) : [...current, id]);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>How are you using Noska?</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>We'll personalize your setup based on your answers.</p>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>Your role</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map((r) => {
              const on = form.role === r.id;
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  onClick={() => setFormField("role", r.id)}
                  whileHover={{ y: -1, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="px-3.5 py-2.5 text-sm rounded-xl text-left transition-colors duration-150 cursor-pointer select-none shadow-xs"
                  style={{
                    background: on ? C.beige : "#fff",
                    border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
                    color: on ? "#5a3e20" : C.muted,
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {r.label}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
            What will you use Noska for? <span className="normal-case font-normal">Select all that apply</span>
          </label>
          <div className="flex flex-col gap-1">
            {USE_CASES.map((uc) => {
              const on = (form.useCase || []).includes(uc.id);
              return (
                <motion.button
                  key={uc.id}
                  type="button"
                  onClick={() => toggleUseCase(uc.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl border transition-colors duration-150 cursor-pointer select-none"
                  style={{
                    border: on ? `1.5px solid ${C.beigeDark}` : "1.5px solid transparent",
                    background: on ? "rgba(227,207,179,0.25)" : "transparent",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: on ? C.beige : "#fff",
                      border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
                      transform: on ? "scale(1)" : "scale(0.9)",
                    }}
                  >
                    {on && <Check size={9} strokeWidth={3.5} style={{ color: "#5a3e20" }} />}
                  </div>
                  <span className="text-base leading-none">{uc.icon}</span>
                  <span style={{ color: on ? "#5a3e20" : C.muted, fontWeight: on ? 500 : 400 }}>{uc.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <PrimaryBtn onClick={next} disabled={!form.role}>Continue <ChevronRight size={15} /></PrimaryBtn>
      </div>
    </div>
  );
}
