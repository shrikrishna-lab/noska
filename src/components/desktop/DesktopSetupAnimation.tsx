import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TetrisLoader } from "@/components/ui/loader-tetris";
import { Sparkles, CheckCircle2, ArrowRight, FolderKanban, Cpu, Database, ShieldCheck } from "lucide-react";

interface DesktopSetupAnimationProps {
  onComplete: () => void;
  autoProgress?: boolean;
}

const STEPS = [
  {
    title: "Unpacking workspace runtime",
    desc: "Extracting local core components & assets",
    icon: FolderKanban,
  },
  {
    title: "Initializing local database",
    desc: "Configuring offline-first SQLite cache & storage",
    icon: Database,
  },
  {
    title: "Connecting AI agent engine",
    desc: "Preparing local intelligence, voice & automations",
    icon: Cpu,
  },
  {
    title: "Security & sandbox verified",
    desc: "Device permissions & encryption keys ready",
    icon: ShieldCheck,
  },
];

export default function DesktopSetupAnimation({
  onComplete,
  autoProgress = true,
}: DesktopSetupAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!autoProgress) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDone(true);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        const bounded = Math.min(next, 100);

        if (bounded > 75) setCurrentStep(3);
        else if (bounded > 50) setCurrentStep(2);
        else if (bounded > 25) setCurrentStep(1);
        else setCurrentStep(0);

        if (bounded === 100) {
          setIsDone(true);
        }
        return bounded;
      });
    }, 280);

    return () => clearInterval(interval);
  }, [autoProgress]);

  const handleFinish = () => {
    try {
      localStorage.setItem("noska_setup_completed", "true");
    } catch {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0B0D13] text-[#EDEBE5] overflow-hidden select-none font-sans">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#0066FF]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#E3CFB3]/10 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative z-10 w-full max-w-xl mx-4 overflow-hidden rounded-2xl border border-white/10 bg-[#141720]/80 p-8 shadow-2xl backdrop-blur-2xl"
      >
        {/* Top Header with Brand Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#0040A8] p-0.5 shadow-lg shadow-[#0066FF]/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg tracking-wider">N</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-[#EDEBE5]">Noska Desktop</h2>
                <span className="inline-flex items-center rounded-full bg-[#E3CFB3]/15 px-2 py-0.5 text-[10px] font-medium text-[#E3CFB3] border border-[#E3CFB3]/20">
                  Setup & Sync
                </span>
              </div>
              <p className="text-xs text-white/50">Next-generation AI workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#E3CFB3]/80 bg-[#E3CFB3]/5 px-2.5 py-1 rounded-full border border-[#E3CFB3]/10">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#E3CFB3]" />
            <span>v1.0.11</span>
          </div>
        </div>

        {/* Main Content Area: Tetris Bot Live Loader */}
        <div className="my-6 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Tetris visualizer container */}
          <div className="md:col-span-2 flex flex-col items-center justify-center rounded-xl bg-[#0F1117] border border-white/5 p-4 shadow-inner">
            <div className="py-2">
              <TetrisLoader
                columns={8}
                rows={16}
                cellSize={4}
                gap={1.5}
                speed={36}
                label="Setting up workspace"
              />
            </div>
            <span className="text-[10px] tracking-wider text-white/40 uppercase mt-2 font-mono">
              Live Engine Bot
            </span>
          </div>

          {/* Progress & Animated Step list */}
          <div className="md:col-span-3 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-white/90">
                  {isDone ? "Workspace Ready" : STEPS[currentStep].title}
                </span>
                <span className="font-mono text-[#E3CFB3] font-semibold">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#0066FF] via-[#4791FF] to-[#E3CFB3]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                />
              </div>
              <p className="text-[11px] text-white/45 truncate">
                {isDone ? "All components initialized and verified." : STEPS[currentStep].desc}
              </p>
            </div>

            {/* Steps indicator */}
            <div className="pt-2 space-y-2">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const active = idx === currentStep;
                const completed = idx < currentStep || isDone;

                return (
                  <div
                    key={step.title}
                    className={`flex items-center gap-2.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                      active
                        ? "bg-white/5 text-white border border-white/10"
                        : completed
                        ? "text-white/60"
                        : "text-white/30"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#0066FF]" : "text-white/30"}`} />
                    )}
                    <span className="truncate text-[11px]">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-white/40">
            {isDone ? "Installation & setup finalized." : "Feel free to watch the bot play while setup finishes."}
          </p>

          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.button
                key="launch-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleFinish}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#2575FC] hover:from-[#0052CC] hover:to-[#1A68E8] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#0066FF]/25 transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            ) : (
              <motion.button
                key="skip-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleFinish}
                className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 cursor-pointer"
              >
                Skip intro
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
