import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, cardVariants } from "../../animations/variants";

const quickTitles = [
  { label: "Project Plan", icon: "📋" },
  { label: "Meeting Notes", icon: "📝" },
  { label: "Study Notes", icon: "📖" },
  { label: "Journal Entry", icon: "📔" },
  { label: "Idea Board", icon: "💡" },
  { label: "Personal Wiki", icon: "📚" }
];

export default function CreateFirstPage() {
  const { form, setFormField, next, back } = useOnboarding();
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-lg mx-auto w-full"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-12 h-12 mx-auto mb-4 bg-white/[0.05] rounded-xl border border-white/[0.08] flex items-center justify-center"
        >
          <FileText className="w-6 h-6 text-noska-blue" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Create your first page</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Give your first page a title. You can always change it later.
        </p>
      </div>

      <div className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={form.pageTitle}
          onChange={(e) => setFormField("pageTitle", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && form.pageTitle.trim()) next(); }}
          placeholder="e.g., My First Page"
          className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base placeholder:text-white/20 focus:outline-none focus:border-noska-blue focus:ring-1 focus:ring-noska-blue/30 transition-all"
          aria-label="Page title"
        />

        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2.5 font-medium">Quick ideas</p>
          <div className="flex flex-wrap gap-2">
            {quickTitles.map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFormField("pageTitle", item.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all text-xs text-[var(--text-secondary)] hover:text-white"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Back
        </button>
        <button
          onClick={next}
          disabled={!form.pageTitle.trim()}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Create Page
        </button>
      </div>
    </motion.div>
  );
}
