import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, scaleIn } from "../../animations/variants";

export default function WelcomeStep() {
  const { next, form } = useOnboarding();
  const btnRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => btnRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center text-center max-w-md mx-auto"
    >
      <motion.div
        variants={scaleIn}
        className="w-16 h-16 mb-6 bg-gradient-to-br from-noska-blue to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-noska-blue/20"
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl font-bold tracking-tight text-[var(--text)]"
      >
        Welcome to Noska
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-[var(--text-secondary)] mt-3 leading-relaxed text-sm"
      >
        Your AI-powered workspace for thinking, writing, and building.
        Let's set up your space in under two minutes.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm"
      >
        {[
          { emoji: "✍️", label: "Write" },
          { emoji: "📊", label: "Organize" },
          { emoji: "🤖", label: "Create" }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-xl">{item.emoji}</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">{item.label}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        ref={btnRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={next}
        className="mt-8 group px-8 py-3 rounded-xl bg-[var(--noska-blue)] text-white font-medium text-sm hover:opacity-90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] inline-flex items-center gap-2"
      >
        Get Started
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </motion.button>
    </motion.div>
  );
}
