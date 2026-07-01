import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, cardVariants } from "../../animations/variants";
import { getUseCaseOptions } from "../../services/onboardingService";

const options = getUseCaseOptions();

export default function PersonalizeStep() {
  const { form, setFormField, next, back } = useOnboarding();

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">What brings you to Noska?</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Choose your primary use case. We'll tailor your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Use case selection">
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setFormField("useCase", opt.id)}
            role="radio"
            aria-checked={form.useCase === opt.id}
            className={`relative flex flex-col items-center gap-2 p-5 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307] ${
              form.useCase === opt.id
                ? "border-noska-blue bg-noska-blue/10 shadow-[0_0_20px_rgba(0,102,255,0.15)]"
                : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="font-medium text-sm text-white">{opt.label}</span>
            <span className="text-[10px] text-[var(--text-secondary)] text-center leading-tight">{opt.desc}</span>
            {form.useCase === opt.id && (
              <motion.div
                layoutId="check"
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-noska-blue"
              />
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3 mt-10 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Back
        </button>
        <button
          onClick={next}
          disabled={!form.useCase}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
