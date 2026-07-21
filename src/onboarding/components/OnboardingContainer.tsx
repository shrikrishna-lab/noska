import React, { Suspense, lazy } from "react";
import { X } from "lucide-react";
import { C } from "../theme";
import { OnboardingProvider, useOnboardingContext, type OnboardingProviderProps } from "../context/OnboardingContext";
import LivePreviewSidebar from "./LivePreviewSidebar";
import StepDots from "./StepDots";
import OnboardingKeyframes from "./OnboardingKeyframes";

const NoskaLogo = "/logo.png";

const WelcomeStep = lazy(() => import("./steps/WelcomeStep"));
const UsernameStep = lazy(() => import("./steps/UsernameStep"));
const WorkspaceStep = lazy(() => import("./steps/WorkspaceStep"));
const TeamSizeStep = lazy(() => import("./steps/TeamSizeStep"));
const RoleStep = lazy(() => import("./steps/RoleStep"));
const InviteStep = lazy(() => import("./steps/InviteStep"));
const OnboardingTemplateStep = lazy(() => import("./steps/OnboardingTemplateStep"));
const DoneStep = lazy(() => import("./steps/DoneStep"));

const stepMap = [WelcomeStep, UsernameStep, WorkspaceStep, TeamSizeStep, RoleStep, InviteStep, OnboardingTemplateStep, DoneStep];

interface OnboardingInnerProps {
  overlay?: boolean;
}

function OnboardingInner({ overlay = false }: OnboardingInnerProps) {
  const { step, direction, totalSteps, skip } = useOnboardingContext();
  const StepComponent = stepMap[step] || stepMap[0];
  const isFirstOrLast = step === 0 || step === totalSteps - 1;

  return (
    <div
      className="onboarding-scope fixed inset-0 z-50 flex"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <LivePreviewSidebar step={step} />

      <div className="flex-1 flex flex-col h-full overflow-y-auto" style={{ background: C.bg }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5 lg:hidden">
            <img src={NoskaLogo} alt="Noska" className="w-7 h-7 rounded-lg object-contain" />
            <span className="text-sm font-semibold" style={{ color: C.text }}>Noska</span>
          </div>
          <div className="hidden lg:block" />
          {!isFirstOrLast && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs" style={{ color: C.muted }}>Step {step} of {totalSteps - 2}</span>
              <StepDots current={step - 1} total={totalSteps - 2} />
            </div>
          )}
          {isFirstOrLast && overlay && (
            <button
              onClick={skip}
              className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
              aria-label="Close onboarding"
            >
              <X className="w-4 h-4" style={{ color: C.muted }} />
            </button>
          )}
          {isFirstOrLast && !overlay && <div className="ml-auto" />}
        </div>

        {/* Step content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[460px]">
            <div
              key={step}
              style={{ animation: `${direction === 1 ? "slideInRight" : "slideInLeft"} 0.25s ease both` }}
            >
              <Suspense fallback={<div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.purple, borderTopColor: "transparent" }} />}>
                <StepComponent />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center justify-between shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-xs" style={{ color: C.muted }}>© 2026 Noska Labs, Inc.</p>
          <div className="flex items-center gap-5">
            {["Privacy", "Terms"].map((t) => (
              <button key={t} className="text-xs transition-colors hover:opacity-70" style={{ color: C.muted }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <OnboardingKeyframes />
    </div>
  );
}

interface OnboardingContainerProps extends Omit<OnboardingProviderProps, "children"> {
  overlay?: boolean;
}

export default function OnboardingContainer({ initialWorkspaceName, initialUsername, currentUserId, onFinalize, onComplete, overlay = false }: OnboardingContainerProps) {
  return (
    <OnboardingProvider
      initialWorkspaceName={initialWorkspaceName}
      initialUsername={initialUsername}
      currentUserId={currentUserId}
      onFinalize={onFinalize}
      onComplete={onComplete}
    >
      <OnboardingInner overlay={overlay} />
    </OnboardingProvider>
  );
}
