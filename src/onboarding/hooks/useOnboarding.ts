import { useOnboardingContext, type OnboardingContextValue } from "../context/OnboardingContext";

export function useOnboarding(): OnboardingContextValue {
  return useOnboardingContext();
}
