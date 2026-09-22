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
  /** Pages staged via the "Bring your notes" import step (ImportStep.tsx).
   *  Kept in memory only — stripped before persisting to localStorage (see
   *  OnboardingContext) since imported blocks can exceed quota. Consumed by
   *  App.tsx's handleFinalize, which turns each entry into a real page. */
  importedPages?: OnboardingImportedPage[];
}

/** A single page staged during onboarding import — same content as the
 *  Import Center's ImportedPageDraft (src/features/import/importTypes.ts),
 *  re-declared here so onboarding stays independent of the main app theme
 *  and import UI. Blocks use the shared Block shape. */
export interface OnboardingImportedPage {
  title: string;
  icon?: string;
  blocks: import("../../types/blocks").Block[];
  sourceFile?: string;
  tags?: string[];
}

/** Cheap { title, icon } preview shown in LivePreviewSidebar — deliberately
 * NOT the same as the real Page shape (src/lib/supabaseService.ts), since
 * previewPagesFor() never needs ids/blocks, just enough to render a list
 * item that mirrors what handleFinalize (src/App.jsx) will actually create. */
export interface OnboardingPagePreview {
  title: string;
  icon: string;
}
