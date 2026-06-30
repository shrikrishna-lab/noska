import React from "react";
import { motion } from "framer-motion";
import RingLoader from "./RingLoader";

export default function AuthLoading({ message = "Connecting to your workspace..." }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#0c0c12]/85 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-3.5 rounded-xl border border-white/[0.04]"
    >
      <RingLoader size={28} />
      <motion.span 
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 0.75, y: 0 }}
        className="text-xs font-mono tracking-widest text-[var(--text-secondary)]"
      >
        {message}
      </motion.span>
    </motion.div>
  );
}
