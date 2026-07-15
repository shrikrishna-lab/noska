import React from "react";
import { motion } from "framer-motion";
import { AnimatedGridPattern } from "@/registry/magicui/animated-grid-pattern";

export default function AnimatedGridLayer({ pan, scale, animated = true }) {
  // Interpolated opacity based on zoom scale:
  // 0.25 -> 0.02, 0.5 -> 0.03, 1.0 -> 0.04, 1.5 -> 0.05, 2.0 -> 0.06
  const gridOpacity = 0.02 + Math.min(0.04, ((scale - 0.25) / 1.75) * 0.04);

  // Parallax grid shifts by 25% of the pan delta
  const parallaxX = pan.x * 0.25;
  const parallaxY = pan.y * 0.25;

  return (
    <motion.div
      style={{
        x: parallaxX,
        y: parallaxY,
        opacity: gridOpacity,
      }}
      transition={animated ? { type: "spring", stiffness: 220, damping: 26 } : { duration: 0 }}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 gpu-accelerated"
    >
      <AnimatedGridPattern
        width={48}
        height={48}
        numSquares={200}
        maxOpacity={1.0} // Control via wrapper opacity instead for full layer smoothness
        duration={10}
        repeatDelay={2}
        strokeDasharray={0}
        className="w-full h-full text-[var(--text)]"
      />
    </motion.div>
  );
}
