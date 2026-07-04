import React from "react";
import { motion } from "framer-motion";
import { stepVariants } from "../animations/variants";

export default function OnboardingStep({
  children,
  title,
  subtitle,
  className = "",
  maxWidth = "max-w-md",
  centered = true,
  showBack = true,
  showSkip = false,
  onBack,
  onSkip,
  backLabel = "Back",
  skipLabel = "Skip",
  footer
}) {
  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full ${maxWidth} ${centered ? "text-center mx-auto" : ""} ${className}`}
    >
      {title && (
        <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">{title}</h2>
      )}
      {subtitle && (
        <p className="text-[var(--text-secondary)] mt-2 text-sm leading-relaxed">{subtitle}</p>
      )}
      <div className={title || subtitle ? "mt-8" : ""}>
        {children}
      </div>
      {(showBack || showSkip || footer) && (
        <div className="flex gap-3 mt-10 justify-center items-center">
          {showBack && (
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-hover)]"
            >
              {backLabel}
            </button>
          )}
          {showSkip && (
            <button
              onClick={onSkip}
              className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-hover)] underline underline-offset-2"
            >
              {skipLabel}
            </button>
          )}
          {footer}
        </div>
      )}
    </motion.div>
  );
}
