import React from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid, Calendar, Columns, Filter, ArrowUpDown, Eye
} from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, fadeUp } from "../../animations/variants";

const views = [
  { icon: LayoutGrid, label: "Table View", desc: "Spreadsheet-style data grid" },
  { icon: Columns, label: "Board View", desc: "Kanban-style column layout" },
  { icon: Calendar, label: "Calendar View", desc: "Timeline and date tracking" },
  { icon: Eye, label: "Gallery View", desc: "Visual card grid layout" }
];

const features = [
  { icon: Filter, label: "Filters", desc: "Show only what matters" },
  { icon: ArrowUpDown, label: "Sorting", desc: "Order by any property" },
  { icon: Columns, label: "Properties", desc: "Custom fields for every row" }
];

export default function DatabaseIntro() {
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
        <h2 className="text-2xl font-bold text-[var(--text)]">Powerful databases</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Turn any page into a database with multiple views, filters, and sorts.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Views</p>
        <div className="grid grid-cols-2 gap-2">
          {views.map((item, i) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--hover)] flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-[var(--noska-blue)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text)]">{item.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider pt-2">Features</p>
        <div className="grid grid-cols-3 gap-2">
          {features.map((item, i) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.3 + i * 0.06 }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center"
            >
              <item.icon className="w-4 h-4 text-[var(--noska-blue)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text)]">{item.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
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
