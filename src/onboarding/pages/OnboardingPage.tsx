import React from "react";
import OnboardingContainer from "../components/OnboardingContainer";

export default function OnboardingPage({ initialWorkspaceName, onFinalize, onComplete, overlay = false }) {
  return (
    <OnboardingContainer
      initialWorkspaceName={initialWorkspaceName}
      onFinalize={onFinalize}
      onComplete={onComplete}
      overlay={overlay}
    />
  );
}
