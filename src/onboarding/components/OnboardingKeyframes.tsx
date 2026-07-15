import React from "react";

/**
 * CSS keyframes used across the onboarding flow, ported from the final
 * design (Noska Onboarding/src/app/App.tsx). Injected once at the root of
 * the onboarding container rather than added to the global stylesheet, so
 * these animations stay scoped to onboarding.
 */
export default function OnboardingKeyframes() {
  return (
    <style>{`
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(18px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-18px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95) translateY(-4px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes bounceIn {
        0%   { transform: scale(0.5); opacity: 0; }
        70%  { transform: scale(1.08); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes popIn {
        0%   { transform: scale(0); opacity: 0; }
        80%  { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.35; }
      }
      .onboarding-scope ::-webkit-scrollbar { display: none; }
    `}</style>
  );
}
