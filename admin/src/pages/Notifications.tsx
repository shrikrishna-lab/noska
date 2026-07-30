import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime, cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { NotificationItem } from "@/lib/types";

const severityIcons: Record<string, string> = { info: "bg-blue-500", warning: "bg-warning", critical: "bg-destructive" };
const typeLabels: Record<string, string> = { invitation: "Invitation", error: "Error", deployment: "Deployment", billing: "Billing", feedback: "Feedback", security: "Security" };

export function Notifications() {
  const { data: notifs, isLoading } = useNotifications();
  useRealtimeInvalidate(["admin", "notifications"], "notifications");

  if (isLoading) return <div className="p-6"><PageHeader title="Notifications" description="System notifications" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Notifications" description="System notifications and alerts" />
      {notifs && notifs.length > 0 ? (
        <div className="space-y-2">
          {notifs.map((n) => (
            <Card key={n.id} className={n.unread ? "border-primary/20 bg-primary/[0.02]" : ""}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", severityIcons[n.severity] ?? "bg-blue-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", n.unread && "font-semibold")}>{n.title}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5">{typeLabels[n.type] ?? n.type}</Badge>
                    {n.unread && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.detail}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" description="Notifications will appear here as system events occur." />
      )}
    </div>
  );
}
