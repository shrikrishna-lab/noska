import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  service: string;
  error: unknown;
  notConfiguredHint: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

// Renders the real error behind a monitoring integration, with actionable
// remediation for the two known configuration failures. Never invents
// placeholder data to cover an error.
export function IntegrationErrorNotice({ service, error, notConfiguredHint, onRetry, isRetrying, className }: Props) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  const notConfigured = message === "SERVICE_NOT_CONFIGURED";
  const missingScope = message === "POSTHOG_TOKEN_MISSING_SCOPE" || message.includes("missing required scope");

  const title = notConfigured
    ? `${service} is not configured`
    : missingScope
      ? `${service} API key is missing a required scope`
      : `${service} unavailable`;
  const detail = notConfigured
    ? notConfiguredHint
    : missingScope
      ? "The configured personal API key lacks the 'query:read' scope. In PostHog go to Settings → Personal API Keys, create a key with the query:read scope, then update the POSTHOG_PERSONAL_TOKEN secret on the monitoring-posthog edge function."
      : `Could not load data from ${service} (${message.slice(0, 200)}).`;

  return (
    <div className={`rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20 ${className ?? ""}`}>
      <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600" />
      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">{detail}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      )}
    </div>
  );
}
