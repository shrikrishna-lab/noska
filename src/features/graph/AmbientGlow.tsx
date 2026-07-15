import React from "react";
import { motion } from "framer-motion";

export default function AmbientGlow({ pan, animated = true }) {
  // Parallax glow shifts by 15% of the pan delta
  const parallaxX = pan.x * 0.15;
  const parallaxY = pan.y * 0.15;

  return (
    <>
      {/* Layer 2: Radial Ambient Lighting Overlay */}
      <motion.div
        style={{
          x: parallaxX,
          y: parallaxY,
        }}
        transition={animated ? { type: "spring", stiffness: 220, damping: 26 } : { duration: 0 }}
        className="absolute inset-[-50px] pointer-events-none z-0 bg-[radial-gradient(circle_at_center,var(--accent-soft)_0%,transparent_65%)] opacity-80 mix-blend-screen"
      />

      {/* Layer 3: Vignette Overlay (Darken edges) */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)] mix-blend-multiply"
      />
    </>
  );
}
