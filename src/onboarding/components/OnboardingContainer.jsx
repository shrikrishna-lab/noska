import React, { Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { OnboardingProvider, useOnboardingContext } from "../context/OnboardingContext";
import StepIndicator from "./StepIndicator";
import { containerVariants } from "../animations/variants";

const WelcomeStep = lazy(() => import("./steps/WelcomeStep"));
const PersonalizeStep = lazy(() => import("./steps/PersonalizeStep"));
const CreateFirstPage = lazy(() => import("./steps/CreateFirstPage"));
const SidebarIntro = lazy(() => import("./steps/SidebarIntro"));
const BlocksIntro = lazy(() => import("./steps/BlocksIntro"));
const DatabaseIntro = lazy(() => import("./steps/DatabaseIntro"));
const CollaborationIntro = lazy(() => import("./steps/CollaborationIntro"));
const TemplatesStep = lazy(() => import("./steps/TemplatesStep"));
const ShortcutsStep = lazy(() => import("./steps/ShortcutsStep"));
const FinalStep = lazy(() => import("./steps/FinalStep"));

const stepMap = [
  WelcomeStep,
  PersonalizeStep,
  CreateFirstPage,
  SidebarIntro,
  BlocksIntro,
  DatabaseIntro,
  CollaborationIntro,
  TemplatesStep,
  ShortcutsStep,
  FinalStep
];

function OnboardingInner({ overlay = false }) {
  const { step, direction, totalSteps, skip } = useOnboardingContext();
  const StepComponent = stepMap[step] || stepMap[0];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`fixed inset-0 z-50 flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden ${overlay ? "backdrop-blur-sm" : ""}`}
    >
      {step < totalSteps - 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <StepIndicator current={step} total={totalSteps} showLabels />
        </div>
      )}

      {overlay && (
        <button
          onClick={skip}
          className="absolute top-6 right-6 z-10 w-8 h-8 rounded-lg bg-[var(--hover)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--active)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--noska-blue)]"
          aria-label="Close onboarding"
        >
          <X className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <AnimatePresence mode="wait" custom={direction}>
          <Suspense
            fallback={
              <div className="w-8 h-8 border-2 border-noska-blue border-t-transparent rounded-full animate-spin" />
            }
          >
            <StepComponent key={`step-${step}`} />
          </Suspense>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function OnboardingContainer({ initialWorkspaceName, onFinalize, onComplete, overlay = false }) {
  return (
    <OnboardingProvider initialWorkspaceName={initialWorkspaceName} onFinalize={onFinalize} onComplete={onComplete}>
      <OnboardingInner overlay={overlay} />
    </OnboardingProvider>
  );
}
