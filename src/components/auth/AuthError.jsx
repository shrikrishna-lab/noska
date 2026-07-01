import React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function AuthError({ message }) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="p-3.5 rounded-lg border border-[var(--danger)]/15 bg-[var(--danger)]/5 text-[var(--danger)] text-xs flex items-start gap-2.5 mb-4 font-sans leading-relaxed"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-[var(--danger)]/80" />
      <span>{message}</span>
    </motion.div>
  );
}
