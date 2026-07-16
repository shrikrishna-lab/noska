import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) console.warn("[sentry] VITE_SENTRY_DSN not set — skipping");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    release: `noska@${APP_VERSION}`,
    environment: import.meta.env.PROD ? "production" : "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
    beforeSend(event) {
      if (import.meta.env.DEV) return null;
      return event;
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
