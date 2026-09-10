import React from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { C } from "../../theme";
import { TEMPLATES } from "../../data";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";

export default function OnboardingTemplateStep() {
  const { form, setFormField, next, back } = useOnboarding();

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Start with a template</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>Choose a starting point for your first page.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((tpl) => {
          const on = form.template === tpl.id;
          return (
            <motion.button
              key={tpl.id}
              type="button"
              onClick={() => setFormField("template", tpl.id)}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="flex flex-col gap-2.5 p-4 rounded-xl text-left transition-colors duration-150 cursor-pointer shadow-xs select-none"
              style={{
                background: on ? "rgba(227,207,179,0.25)" : "#fff",
                border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
              }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={tpl.emoji ? "text-xl leading-none" : "text-base font-mono leading-none"}
                  style={!tpl.emoji ? { color: C.muted } : {}}
                >
                  {tpl.icon}
                </span>
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: on ? C.beige : "#fff",
                    border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
                    transform: on ? "scale(1)" : "scale(0.85)",
                  }}
                >
                  {on && <Check size={9} strokeWidth={3.5} style={{ color: "#5a3e20" }} />}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold" style={{ color: on ? "#5a3e20" : C.text }}>{tpl.label}</span>
                <span className="text-xs leading-relaxed" style={{ color: C.muted }}>{tpl.desc}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <PrimaryBtn onClick={next} disabled={!form.template}>Continue <ChevronRight size={15} /></PrimaryBtn>
      </div>
    </div>
  );
}
