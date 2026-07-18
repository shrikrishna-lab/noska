import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) console.warn("[sentry] VITE_SENTRY_DSN not set — skipping");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
    tracePropagationTargets: [
      /^https?:\/\/localhost(:\d+)?/,
      /^https:\/\/([a-z0-9-]+\.)?noska\.dev/,
      /^https:\/\/([a-z0-9-]+\.)?noska\.app/,
      /^https:\/\/([a-z0-9-]+\.)?noska\.vercel\.app/,
      /^https:\/\/yxgtmzksnyarlivgxujf\.supabase\.co/,
    ],
    beforeSend(event) {
      if (import.meta.env.DEV) return null;
      return event;
    },
    beforeSendTransaction(event) {
      if (import.meta.env.DEV) return null;
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        const url = breadcrumb.data?.url as string | undefined;
        if (url && !url.startsWith(window.location.origin) && !url.includes("supabase.co") && !url.includes("clerk.")) {
          return null;
        }
      }
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
        return null;
      }
      if (breadcrumb.category === "ui.click") {
        const selector = breadcrumb.message || "";
        if (/password|secret|token|key|jwt|credit|ssn|ssn/i.test(selector)) {
          return null;
        }
      }
      return breadcrumb;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string; name?: string } | null) {
  if (!SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "error") {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

export { Sentry };
