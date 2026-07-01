import React from "react";
import { motion } from "framer-motion";
import {
  Keyboard, Bold, Italic, Underline, Strikethrough,
  Undo2, Redo2, PanelLeft, Plus, Slash, Search
} from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, fadeUp } from "../../animations/variants";

const shortcuts = [
  { keys: ["Ctrl", "K"], label: "Command Palette", icon: Search },
  { keys: ["Ctrl", "N"], label: "New Page", icon: Plus },
  { keys: ["Ctrl", "B"], label: "Bold", icon: Bold },
  { keys: ["Ctrl", "I"], label: "Italic", icon: Italic },
  { keys: ["Ctrl", "U"], label: "Underline", icon: Underline },
  { keys: ["Ctrl", "Shift", "S"], label: "Strikethrough", icon: Strikethrough },
  { keys: ["Ctrl", "Z"], label: "Undo", icon: Undo2 },
  { keys: ["Ctrl", "Shift", "Z"], label: "Redo", icon: Redo2 },
  { keys: ["Ctrl", "\\"], label: "Toggle Sidebar", icon: PanelLeft },
  { keys: ["/"], label: "Block Menu", icon: Slash }
];

export default function ShortcutsStep() {
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-12 h-12 mx-auto mb-4 bg-white/[0.05] rounded-xl border border-white/[0.08] flex items-center justify-center"
        >
          <Keyboard className="w-6 h-6 text-noska-blue" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Keyboard shortcuts</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Master these to fly around your workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-noska-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">{item.label}</p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              {item.keys.map((k, j) => (
                <span
                  key={j}
                  className="text-[9px] font-mono text-[var(--text-secondary)] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]"
                >
                  {k}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 text-center text-[10px] text-[var(--text-secondary)]"
      >
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[11px] font-mono text-noska-blue">Ctrl + K</kbd> to see all available commands
      </motion.p>

      <div className="flex gap-3 mt-6 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Back
        </button>
        <button
          onClick={next}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
