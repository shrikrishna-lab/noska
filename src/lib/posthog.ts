import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

export function initPosthog() {
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) console.warn("[posthog] VITE_POSTHOG_KEY not set — skipping");
    return false;
  }
  if (typeof window === "undefined") return false;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    loaded: (ph) => {
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>).__PostHog__ = ph;
      }
    },
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
    },
    respect_dnt: true,
    capture_performance: {
      web_vitals: true,
      network_timing: true,
    },
  });
  return true;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function resetIdentity() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

type EventName =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "logout"
  | "google_login"
  | "microsoft_login"
  | "waitlist_joined"
  | "workspace_created"
  | "workspace_deleted"
  | "note_created"
  | "page_updated"
  | "page_deleted"
  | "template_created"
  | "search_used"
  | "command_palette_opened"
  | "ai_generation"
  | "error_occurred"
  | "favorite_added"
  | "favorite_removed"
  | "invite_sent"
  | "billing_started"
  | "subscription_changed"
  | "feedback_submitted"
  | "feature_used"
  | "comment_added"
  | "voice_note_inserted";

export function capture(event: EventName, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export const analytics = {
  trackPageView(path: string) {
    capture("page_view", { path });
  },

  trackSignIn(method: "google" | "microsoft" | "github" | "email") {
    capture("login", { method });
  },

  trackSignOut() {
    capture("logout");
    resetIdentity();
  },

  trackRegistration(method?: string) {
    capture("signup_completed", { method });
  },

  trackWorkspaceCreated() {
    capture("workspace_created");
  },

  trackWorkspaceDeleted() {
    capture("workspace_deleted");
  },

  trackPageCreated(template?: string) {
    capture("note_created", { template });
  },

  trackPageUpdated() {
    capture("page_updated");
  },

  trackPageDeleted() {
    capture("page_deleted");
  },

  trackFavoriteAdded() {
    capture("favorite_added");
  },

  trackFavoriteRemoved() {
    capture("favorite_removed");
  },

  trackSearch() {
    capture("search_used");
  },

  trackAIPrompt(provider: string, model: string) {
    capture("ai_generation", { provider, model, type: "prompt" });
  },

  trackAIResponse(provider: string, model: string, latencyMs?: number) {
    capture("ai_generation", { provider, model, type: "response", latencyMs });
  },

  trackInviteSent(method: string) {
    capture("invite_sent", { method });
  },

  trackWaitlistJoined() {
    capture("waitlist_joined");
  },

  trackBillingStarted(plan?: string) {
    capture("billing_started", { plan });
  },

  trackSubscriptionChanged(plan: string, action: "upgraded" | "cancelled" | "downgraded") {
    capture("subscription_changed", { plan, action });
  },

  trackFeedback(category: string, rating?: number) {
    capture("feedback_submitted", { category, rating });
  },

  trackTemplateCreated(templateName: string) {
    capture("template_created", { templateName });
  },

  trackFeatureUsed(feature: string) {
    capture("feature_used", { feature });
  },

  trackError(context?: Record<string, unknown>) {
    capture("error_occurred", context);
  },
};

export function getFeatureFlag(key: string): string | boolean {
  return posthog.getFeatureFlag(key);
}

export function getFeatureFlagPayload(key: string) {
  return posthog.getFeatureFlagPayload(key);
}

export function onFeatureFlag(callback: (flags: string[]) => void) {
  posthog.onFeatureFlags(callback);
}

export function isFeatureEnabled(flag: string): boolean {
  return posthog.isFeatureEnabled(flag) ?? false;
}

export function reloadFeatureFlags() {
  posthog.reloadFeatureFlags();
}

export function startSessionRecording() {
  posthog.startSessionRecording();
}

export function stopSessionRecording() {
  posthog.stopSessionRecording();
}

export default posthog;
