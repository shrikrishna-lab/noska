import React from "react";
import AnimatedGridLayer from "./AnimatedGridLayer";
import AmbientGlow from "./AmbientGlow";

export default function GraphBackground({ pan, scale, animated = true }) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0">
      {/* Layer 1: Parallax Animated Grid */}
      <AnimatedGridLayer pan={pan} scale={scale} animated={animated} />
      
      {/* Layer 2 & 3: Parallax Glow & Vignette */}
      <AmbientGlow pan={pan} animated={animated} />
    </div>
  );
}
