import React from "react";
import { motion } from "framer-motion";
import {
  Type, List, CheckSquare, Image, Code, Table,
  Quote, Heading1, Heading2, Heading3, SeparatorHorizontal, Slash
} from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, fadeUp } from "../../animations/variants";

const blockTypes = [
  { icon: Type, label: "Text", desc: "Just start typing" },
  { icon: Heading1, label: "Heading 1", desc: "Large section title" },
  { icon: Heading2, label: "Heading 2", desc: "Medium section title" },
  { icon: Heading3, label: "Heading 3", desc: "Small section title" },
  { icon: List, label: "Bullet List", desc: "Simple bullet points" },
  { icon: CheckSquare, label: "To-do List", desc: "Checkbox items" },
  { icon: Quote, label: "Quote", desc: "Blockquote style" },
  { icon: Code, label: "Code Block", desc: "Code with syntax highlighting" },
  { icon: Image, label: "Image", desc: "Add images and media" },
  { icon: Table, label: "Table", desc: "Simple data tables" },
  { icon: SeparatorHorizontal, label: "Divider", desc: "Visual separator" }
];

export default function BlocksIntro() {
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
        <h2 className="text-2xl font-bold text-white">Building with blocks</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Everything in Noska is a block. Type <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[11px] font-mono text-noska-blue">/</kbd> to choose from dozens of block types.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {blockTypes.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-noska-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">{item.label}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 p-3 rounded-xl bg-noska-blue/5 border border-noska-blue/10 flex items-center gap-3"
      >
        <Slash className="w-5 h-5 text-noska-blue shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[11px] font-mono text-noska-blue">/</kbd> anywhere on a page to open the block menu with categories, search, and previews.
        </p>
      </motion.div>

      <div className="flex gap-3 mt-8 justify-center">
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
