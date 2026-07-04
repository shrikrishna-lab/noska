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
        <h2 className="text-2xl font-bold text-[var(--text)]">What brings you to Noska?</h2>
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
            className={`relative flex flex-col items-center gap-2 p-5 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
              form.useCase === opt.id
                ? "border-[var(--noska-blue)] bg-[var(--noska-blue-soft)] shadow-[0_0_20px_var(--noska-blue-soft)]"
                : "border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--hover)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="font-medium text-sm text-[var(--text)]">{opt.label}</span>
            <span className="text-[10px] text-[var(--text-secondary)] text-center leading-tight">{opt.desc}</span>
            {form.useCase === opt.id && (
              <motion.div
                layoutId="check"
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[var(--noska-blue)]"
              />
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3 mt-10 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-hover)]"
        >
          Back
        </button>
        <button
          onClick={next}
          disabled={!form.useCase}
          className="px-6 py-2.5 rounded-lg bg-[var(--noska-blue)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
