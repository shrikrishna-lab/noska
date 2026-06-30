import React from "react";
import { motion } from "framer-motion";
import { revealVariants } from "./useAuthMotion";

export default function AuthCard({ children, className = "" }) {
  return (
    <motion.div
      variants={revealVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`
        w-full max-w-[400px] sm:max-w-[420px] rounded-2xl border border-white/[0.06]
        bg-[#0c0c12]/70 backdrop-blur-2xl p-8 sm:p-10
        shadow-[0_32px_96px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.03)]
        relative overflow-hidden ${className}
      `}
    >
      {/* Premium Desktop Light Accent Border */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl" 
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), inset 0 0 0 1px rgba(0, 102, 255, 0.03)"
        }}
      />

      {/* Very quiet background light field inside the card */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-noska-blue/5 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-noska-blue/5 rounded-full blur-2xl pointer-events-none -z-10" />

      {children}
    </motion.div>
  );
}
