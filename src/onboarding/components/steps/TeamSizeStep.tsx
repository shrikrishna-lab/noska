import React from "react";
import { ChevronRight, Users } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";

const TEAM_SIZES = [
  { id: "1", label: "Just me", icon: "🙋" },
  { id: "2-5", label: "2–5 people", icon: "👥" },
  { id: "6-20", label: "6–20 people", icon: "🏢" },
  { id: "21-100", label: "21–100 people", icon: "🏛️" },
  { id: "100+", label: "100+ people", icon: "🌐" },
];

const GOALS = [
  { id: "notes", label: "Personal notes & docs" },
  { id: "knowledge", label: "Team knowledge base" },
  { id: "projects", label: "Project management" },
  { id: "wiki", label: "Internal wiki" },
  { id: "docs", label: "Documentation" },
  { id: "productivity", label: "Personal productivity" },
];

export default function TeamSizeStep() {
  const { form, setFormField, next, back } = useOnboarding();

  const toggleGoal = (id: string) => {
    const current = form.goals || [];
    setFormField("goals", current.includes(id) ? current.filter((g) => g !== id) : [...current, id]);
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Tell us about your team</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>Help us tailor the experience for you.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
          Team size
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {TEAM_SIZES.map((s, i) => {
            const on = form.teamSize === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFormField("teamSize", s.id)}
                className="flex flex-col items-center gap-1.5 px-3 py-3 text-sm rounded-xl text-left transition-all duration-200"
                style={{
                  background: on ? C.beige : "#fff",
                  border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
                  animation: `fadeSlideIn 0.25s ease ${i * 40}ms both`,
                }}
              >
                <span className="text-xl">{s.icon}</span>
                <span style={{ color: on ? "#5a3e20" : C.text, fontWeight: on ? 600 : 400 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
          What are your main goals? <span className="normal-case font-normal">Select all that apply</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {GOALS.map((g, i) => {
            const on = (form.goals || []).includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className="px-3.5 py-2.5 text-sm rounded-xl text-left transition-all duration-200 hover:shadow-sm"
                style={{
                  background: on ? C.beige : "#fff",
                  border: on ? `1.5px solid ${C.beigeDark}` : `1.5px solid ${C.border}`,
                  color: on ? "#5a3e20" : C.text,
                  fontWeight: on ? 600 : 400,
                  animation: `fadeSlideIn 0.25s ease ${i * 40 + 200}ms both`,
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <PrimaryBtn onClick={next}>
          Continue <ChevronRight size={15} />
        </PrimaryBtn>
      </div>
    </div>
  );
}
