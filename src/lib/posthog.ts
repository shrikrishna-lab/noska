import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";

export function initPosthog() {
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) console.warn("[posthog] VITE_POSTHOG_KEY not set — skipping");
    return false;
  }
  if (typeof window === "undefined") return false;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing();
    },
    disable_session_recording: import.meta.env.DEV,
    respect_dnt: true,
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
  | "note_created"
  | "template_created"
  | "search_used"
  | "command_palette_opened"
  | "ai_generation"
  | "error_occurred";

export function capture(event: EventName, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export default posthog;
