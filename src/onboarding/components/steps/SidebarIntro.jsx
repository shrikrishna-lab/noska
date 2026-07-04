import React from "react";
import { motion } from "framer-motion";
import { PanelLeftOpen, Search, Plus, Settings } from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, fadeUp } from "../../animations/variants";

const features = [
  { icon: PanelLeftOpen, label: "Navigate", desc: "Browse all pages from the sidebar", shortcut: "Ctrl + \\" },
  { icon: Search, label: "Quick Find", desc: "Search across all pages instantly", shortcut: "Ctrl + K" },
  { icon: Plus, label: "New Page", desc: "Create pages with one click", shortcut: "Ctrl + N" },
  { icon: Settings, label: "Settings", desc: "Customize your workspace", shortcut: "Ctrl + ," }
];

export default function SidebarIntro() {
  const { next, back } = useOnboarding();

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-lg mx-auto w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--text)]">Meet your sidebar</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Your command center for navigating and managing pages.
        </p>
      </div>

      <div className="space-y-2.5">
        {features.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--hover)] flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-[var(--noska-blue)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface-3)] px-2 py-1 rounded-md border border-[var(--border)] shrink-0">
              {item.shortcut}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 mt-8 justify-center">
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
          Continue
        </button>
      </div>
    </motion.div>
  );
}
