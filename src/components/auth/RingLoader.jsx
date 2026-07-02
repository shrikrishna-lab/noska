import React from "react";
import { motion } from "framer-motion";

export default function RingLoader({ size = 24, className = "" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Ambient shadow/glow ring */}
      <div 
        className="absolute rounded-full border border-slate-200/80 pointer-events-none"
        style={{ width: size + 4, height: size + 4 }}
      />
      
      {/* Spinner Ring */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 1.1,
        }}
        className="relative"
      >
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--noska-blue)" stopOpacity="1" />
            <stop offset="60%" stopColor="var(--noska-blue)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--noska-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="url(#ring-gradient)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="95 30"
        />
      </motion.svg>
    </div>
  );
}
