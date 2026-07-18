import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/notifications/types";
import { ExternalLink, Bug, Activity, Triangle, Database, Mail, UserCheck, Eye, BarChart3, Server, Logs } from "lucide-react";

interface SmartActionsProps {
  notification: AppNotification;
  onAction?: () => void;
}

export function SmartActions({ notification, onAction }: SmartActionsProps) {
  const source = notification.source;
  const entityId = notification.entity_id;
  const actionUrl = notification.action_url;

  const actions = getActionsForSource(source, entityId, actionUrl);

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.label} variant="outline" size="sm" asChild onClick={onAction}>
          <a href={action.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
            {action.icon}
            <span>{action.label}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </Button>
      ))}
    </div>
  );
}

interface ActionDef {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getActionsForSource(source: string | null, entityId: string | null, actionUrl: string | null): ActionDef[] {
  const result: ActionDef[] = [];

  if (actionUrl) {
    result.push({
      label: "View Details",
      href: actionUrl,
      icon: <Eye className="h-3.5 w-3.5" />,
    });
  }

  switch (source) {
    case "sentry": {
      const org = import.meta.env.VITE_SENTRY_ORG ?? "";
      result.push(
        { label: "Open Issue", href: entityId ? `https://sentry.io/organizations/${org}/issues/${entityId}/` : `https://sentry.io`, icon: <Bug className="h-3.5 w-3.5" /> },
        { label: "View Performance", href: `https://sentry.io/organizations/${org}/performance/`, icon: <Activity className="h-3.5 w-3.5" /> },
      );
      break;
    }
    case "posthog": {
      result.push(
        { label: "Open Session", href: entityId ? `https://app.posthog.com/project/${import.meta.env.VITE_POSTHOG_PROJECT_ID ?? ""}/person/${entityId}` : `https://app.posthog.com`, icon: <UserCheck className="h-3.5 w-3.5" /> },
        { label: "View Analytics", href: "https://app.posthog.com", icon: <BarChart3 className="h-3.5 w-3.5" /> },
      );
      break;
    }
    case "vercel": {
      result.push(
        { label: "Open Deployment", href: entityId ? `https://vercel.com/${import.meta.env.VITE_VERCEL_TEAM_ID ? import.meta.env.VITE_VERCEL_TEAM_ID + "/" : ""}${import.meta.env.VITE_VERCEL_PROJECT_ID ?? ""}/${entityId}` : `https://vercel.com`, icon: <Triangle className="h-3.5 w-3.5" /> },
        { label: "View Logs", href: `https://vercel.com/${import.meta.env.VITE_VERCEL_TEAM_ID ? import.meta.env.VITE_VERCEL_TEAM_ID + "/" : ""}${import.meta.env.VITE_VERCEL_PROJECT_ID ?? ""}/logs`, icon: <Logs className="h-3.5 w-3.5" /> },
      );
      break;
    }
    case "supabase": {
      result.push(
        { label: "Open Database", href: `https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_REF ?? ""}/editor`, icon: <Database className="h-3.5 w-3.5" /> },
        { label: "View Logs", href: `https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_REF ?? ""}/logs`, icon: <Logs className="h-3.5 w-3.5" /> },
      );
      break;
    }
    case "resend": {
      result.push(
        { label: "View Email", href: entityId ? `https://resend.com/emails/${entityId}` : `https://resend.com`, icon: <Mail className="h-3.5 w-3.5" /> },
      );
      break;
    }
    case "clerk": {
      result.push(
        { label: "Open User", href: entityId ? `https://dashboard.clerk.com/last-active?path=/users/${entityId}` : `https://dashboard.clerk.com`, icon: <UserCheck className="h-3.5 w-3.5" /> },
        { label: "View Auth Logs", href: `https://dashboard.clerk.com`, icon: <ShieldIcon className="h-3.5 w-3.5" /> },
      );
      break;
    }
  }

  return result;
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
