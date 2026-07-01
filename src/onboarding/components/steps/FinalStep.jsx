import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, ArrowRight, Zap, BookOpen, Share2, Palette
} from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, scaleIn } from "../../animations/variants";
import { getUseCaseOptions } from "../../services/onboardingService";

const particleCount = 20;

function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-noska-blue/30"
          initial={{
            x: "50%",
            y: "50%",
            scale: 0,
            opacity: 0
          }}
          animate={{
            x: `${40 + Math.random() * 20}%`,
            y: `${30 + Math.random() * 40}%`,
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

export default function FinalStep() {
  const { form, complete } = useOnboarding();
  const [showContent, setShowContent] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 400);
    const t2 = setTimeout(() => btnRef.current?.focus(), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const useCaseLabel = getUseCaseOptions().find(o => o.id === form.useCase)?.label || "";

  const highlights = [
    { icon: Zap, label: "Smart Blocks", desc: "40+ block types with AI" },
    { icon: BookOpen, label: "Starter Pages", desc: `Tailored for ${useCaseLabel}` },
    { icon: Share2, label: "Collaboration", desc: "Real-time team editing" },
    { icon: Palette, label: "Customizable", desc: "Themes, icons, covers" }
  ];

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center text-center max-w-md mx-auto relative"
    >
      <Particles />

      <motion.div
        variants={scaleIn}
        className="w-16 h-16 mb-6 bg-gradient-to-br from-noska-blue to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-noska-blue/20 relative z-10"
      >
        <Rocket className="w-8 h-8 text-white" />
      </motion.div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            <h1 className="text-3xl font-bold text-white tracking-tight">
              You're all set!
            </h1>
            <p className="text-[var(--text-secondary)] mt-3 text-sm leading-relaxed">
              Your workspace is ready. We've prepared everything based on your choices.
              Here's what's waiting for you:
            </p>

            <div className="mt-8 space-y-2.5 text-left">
              {highlights.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="w-8 h-8 rounded-lg bg-noska-blue/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-noska-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              ref={btnRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={complete}
              className="mt-8 group px-8 py-3 rounded-xl bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307] inline-flex items-center gap-2"
            >
              Start using Noska
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
