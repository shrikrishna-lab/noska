import React from "react";
import OnboardingContainer from "../components/OnboardingContainer";
import type { OnboardingFormData, OnboardingPagePreview } from "../types";

interface OnboardingPageProps {
  initialWorkspaceName?: string;
  initialUsername?: string;
  currentUserId?: string;
  onFinalize?: (data: OnboardingFormData) => Promise<OnboardingPagePreview[]> | OnboardingPagePreview[];
  onComplete?: (data: OnboardingFormData, pages: OnboardingPagePreview[]) => void;
  overlay?: boolean;
}

export default function OnboardingPage({ initialWorkspaceName, initialUsername, currentUserId, onFinalize, onComplete, overlay = false }: OnboardingPageProps) {
  return (
    <OnboardingContainer
      initialWorkspaceName={initialWorkspaceName}
      initialUsername={initialUsername}
      currentUserId={currentUserId}
      onFinalize={onFinalize}
      onComplete={onComplete}
      overlay={overlay}
    />
  );
}
