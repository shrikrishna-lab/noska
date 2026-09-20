import React from "react";
import { motion } from "framer-motion";
import NoskaOrbitalUpdater from "./NoskaOrbitalUpdater";
import packageJson from "../../../package.json";

interface DesktopSetupAnimationProps {
  onComplete: () => void;
  autoProgress?: boolean;
}

export default function DesktopSetupAnimation({
  onComplete,
  autoProgress = true,
}: DesktopSetupAnimationProps) {
  const version = packageJson.version || "1.1.1";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0B0D13]/95 text-[#EDEBE5] overflow-hidden select-none font-sans p-4 sm:p-8 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="relative z-10 w-full max-w-4xl h-[660px] overflow-hidden rounded-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(255,140,115,0.25)]"
      >
        <NoskaOrbitalUpdater
          mode="installer"
          currentVersion={version}
          targetVersion={version}
          onComplete={onComplete}
          autoStart={autoProgress}
        />
      </motion.div>
    </div>
  );
}

