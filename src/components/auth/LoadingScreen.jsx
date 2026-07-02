import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoLoader from "./LogoLoader";
import RingLoader from "./RingLoader";
import LoadingStageText from "./LoadingStageText";
import { useLoadingStages } from "./useLoadingStages";
import { screenTransitionVariants } from "./useAuthMotion";

export default function LoadingScreen({ onComplete }) {
  const { stageText, stageIndex, totalStages } = useLoadingStages(onComplete);
  const progress = ((stageIndex + 1) / totalStages) * 100;

  return (
    <motion.div
      variants={screenTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 w-full h-full bg-[#f8fafc] z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Premium organic floating light gradients */}
      <motion.div
        className="absolute -top-[10%] -left-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-blue-300/15 to-indigo-300/15 blur-[100px] pointer-events-none"
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-[10%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-indigo-300/15 to-purple-300/15 blur-[100px] pointer-events-none"
        animate={{
          x: [0, -40, 0],
          y: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Interactive, self-assembling application wireframe in the background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 0.22, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[720px] h-[440px] border border-slate-200/50 bg-white/40 backdrop-blur-[6px] rounded-3xl shadow-xl flex overflow-hidden"
        >
          {/* Top window controls */}
          <div className="absolute top-4 left-5 flex gap-1.5 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300/60 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300/60 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300/60 animate-pulse" />
          </div>

          {/* Sidebar Area */}
          <div className="w-[180px] border-r border-slate-200/40 p-5 pt-12 flex flex-col gap-4 shrink-0 bg-slate-50/20">
            <AnimatePresence>
              {stageIndex >= 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-3"
                >
                  <div className="h-3.5 bg-slate-300/50 rounded-md w-2/3 animate-pulse" />
                  <div className="flex flex-col gap-2.5 mt-4">
                    <div className="h-2.5 bg-slate-200/50 rounded w-11/12" />
                    <div className="h-2.5 bg-slate-200/50 rounded w-4/5" />
                    <div className="h-2.5 bg-slate-200/50 rounded w-5/6" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 pt-12 flex flex-col gap-6 relative">
            <AnimatePresence>
              {stageIndex >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="h-6 bg-slate-300/50 rounded-md w-1/3 animate-pulse"
                />
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3.5">
              <AnimatePresence>
                {stageIndex >= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="h-3 bg-slate-200/40 rounded w-full" />
                    <div className="h-3 bg-slate-200/40 rounded w-[92%]" />
                    <div className="h-3 bg-slate-200/40 rounded w-[96%]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Assistant card floating */}
            <AnimatePresence>
              {stageIndex >= 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 20 }}
                  className="absolute bottom-5 right-5 w-44 p-3 bg-white/75 border border-slate-200/60 rounded-xl shadow-md flex items-center gap-2.5"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-600 font-bold shrink-0 animate-pulse">
                    ✦
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="h-2 bg-blue-500/20 rounded w-2/3 animate-pulse" />
                    <div className="h-1.5 bg-slate-200/40 rounded w-1/2" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Decorative center glow for loader */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-noska-blue/[0.04] blur-[120px] pointer-events-none" />

      <div className="flex flex-col items-center gap-9 relative z-10">
        {/* Breathing Logo */}
        <LogoLoader />

        {/* Loading Spinner, Stage Text, and Progress Bar Group */}
        <div className="flex flex-col items-center gap-4 mt-2 w-64">
          <div className="flex items-center gap-2.5">
            <RingLoader size={16} />
            <LoadingStageText text={stageText} />
          </div>

          {/* Premium micro-progress bar */}
          <div className="w-48 h-1 bg-slate-200/50 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
