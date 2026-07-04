import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, cardVariants } from "../../animations/variants";

const templates = [
  { id: "project", icon: "📋", label: "Project Plan", desc: "Goals, milestones, timeline" },
  { id: "meeting", icon: "📝", label: "Meeting Notes", desc: "Agenda, decisions, actions" },
  { id: "study", icon: "📖", label: "Study Notes", desc: "Concepts, summaries, review" },
  { id: "journal", icon: "📔", label: "Journal Entry", desc: "Daily reflections and notes" },
  { id: "roadmap", icon: "🗺️", label: "Product Roadmap", desc: "Q1-Q4 planning" },
  { id: "sprint", icon: "🎯", label: "Sprint Backlog", desc: "Tasks in columns" },
  { id: "wiki", icon: "📚", label: "Team Wiki", desc: "Docs, processes, guidelines" },
  { id: "finance", icon: "💰", label: "Finance Tracker", desc: "Income, expenses, budget" },
  { id: "ideas", icon: "💡", label: "Idea Board", desc: "Brainstorm and collect ideas" },
  { id: "notes", icon: "📓", label: "Quick Notes", desc: "Capture anything fast" }
];

export default function TemplatesStep() {
  const { form, setFormField, next, back } = useOnboarding();

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--text)]">Choose starter templates</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Pick a template to get started quickly. We'll create a page for you.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {templates.map((t, i) => (
          <motion.button
            key={t.id}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            whileTap="tap"
            transition={{ delay: i * 0.03 }}
            onClick={() => setFormField("template", t.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
              form.template === t.id
                ? "border-[var(--noska-blue)] bg-[var(--noska-blue-soft)] shadow-[0_0_20px_var(--noska-blue-soft)]"
                : "border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--hover)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium text-[var(--text)]">{t.label}</span>
            <span className="text-[9px] text-[var(--text-secondary)] leading-tight">{t.desc}</span>
            {form.template === t.id && (
              <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--noska-blue)]" />
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3 mt-10 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-hover)]"
        >
          Back
        </button>
        <button
          onClick={next}
          className="px-6 py-2.5 rounded-lg bg-[var(--noska-blue)] text-white font-medium text-sm hover:opacity-90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          {form.template ? "Use Template" : "Skip"}
        </button>
      </div>
    </motion.div>
  );
}
