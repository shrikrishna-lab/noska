import React from "react";
import { motion } from "framer-motion";
import RingLoader from "./RingLoader";

export default function AuthLoading({ message = "Connecting to your workspace..." }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4"
    >
      <RingLoader size={28} />
      <motion.span 
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 0.75, y: 0 }}
        className="text-[11px] font-mono font-medium tracking-wider text-slate-500 uppercase"
      >
        {message}
      </motion.span>
    </motion.div>
  );
}
