import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingStageText({ text, className = "" }) {
  return (
    <div className={`h-6 flex items-center justify-center overflow-hidden select-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.6, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs font-mono font-medium tracking-widest text-[var(--text-secondary)]"
          aria-live="polite"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
