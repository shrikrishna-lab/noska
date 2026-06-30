import React from "react";
import { motion } from "framer-motion";
import LogoLoader from "./LogoLoader";
import RingLoader from "./RingLoader";
import LoadingStageText from "./LoadingStageText";
import { useLoadingStages } from "./useLoadingStages";
import { screenTransitionVariants } from "./useAuthMotion";

export default function LoadingScreen({ onComplete }) {
  const { stageText } = useLoadingStages(onComplete);

  return (
    <motion.div
      variants={screenTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 w-full h-full bg-[#030307] z-50 flex flex-col items-center justify-center"
    >
      {/* Decorative center glow for loader */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-noska-blue/[0.02] blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Breathing Logo */}
        <LogoLoader />

        {/* Loading Spinner & Stage Text Group */}
        <div className="flex flex-col items-center gap-3.5 mt-2">
          <RingLoader size={18} />
          <LoadingStageText text={stageText} />
        </div>
      </div>
    </motion.div>
  );
}
