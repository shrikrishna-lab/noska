import React from "react";
import { motion } from "framer-motion";
import { logoVariants } from "./useAuthMotion";

export default function LogoLoader({ className = "" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Soft Glow Field */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-blue-400/25 to-indigo-400/25 blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Main Logo Container */}
      <motion.div
        variants={logoVariants}
        initial="initial"
        animate={["animate", "breath"]}
        className="relative z-10 w-16 h-16 md:w-20 md:h-20"
      >
        <img
          src="/logo.png"
          alt="Noska Logo"
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </motion.div>
    </div>
  );
}
