// Shapes for the onboarding flow's form state and finalize/preview data.
// Inferred from the reducer's initialState and services/onboardingService.js
// (previewPagesFor, starterPageForTemplate) — not from any aspirational
// schema.

export interface OnboardingTeammate {
  id: string;
  email: string;
}

export interface OnboardingFormData {
  username: string;
  workspaceName: string;
  workspaceIcon: string;
  role: string;
  useCase: string[];
  teamSize: string;
  goals: string[];
  teammates: OnboardingTeammate[];
  template: string;
  inviteCode: string;
}

/** Cheap { title, icon } preview shown in LivePreviewSidebar — deliberately
 * NOT the same as the real Page shape (src/lib/supabaseService.ts), since
 * previewPagesFor() never needs ids/blocks, just enough to render a list
 * item that mirrors what handleFinalize (src/App.jsx) will actually create. */
export interface OnboardingPagePreview {
  title: string;
  icon: string;
}
