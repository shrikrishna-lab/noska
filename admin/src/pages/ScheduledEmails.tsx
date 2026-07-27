import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmailCampaigns, useUpdateEmailCampaign } from "@/lib/queries";
import { useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { Clock, Send, XCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export function ScheduledEmails() {
  const { data: campaigns, isLoading } = useEmailCampaigns();
  const update = useUpdateEmailCampaign();
  useRealtimeInvalidate(["admin", "campaigns"], "email_campaigns");

  const scheduled = useMemo(() =>
    (campaigns ?? []).filter((c) => c.status === "scheduled").sort(
      (a, b) => new Date(a.scheduled_for ?? 0).getTime() - new Date(b.scheduled_for ?? 0).getTime()
    ),
    [campaigns]
  );

  const handleCancel = async (id: string) => {
    try {
      await update.mutateAsync({ id, status: "draft", scheduled_for: undefined });
      toast.success("Campaign unscheduled");
    } catch { toast.error("Failed to unschedule campaign"); }
  };

  const handleSendNow = async (id: string) => {
    try {
      await update.mutateAsync({ id, status: "sending" });
      toast.success("Campaign sending...");
    } catch { toast.error("Failed to send campaign"); }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Emails"
        description={`${scheduled.length} campaigns scheduled`}
      />

      {scheduled.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No scheduled campaigns</p>
            <p className="text-xs mt-1">Schedule a campaign from the Email Campaigns page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scheduled.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-indigo-100 dark:bg-indigo-900/30">
                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.recipients} recipients · Subject: {c.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled: {c.scheduled_for ? new Date(c.scheduled_for).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{new Date(c.scheduled_for ?? "").toLocaleDateString()}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleSendNow(c.id)}>
                    <Send className="mr-1 h-3 w-3" /> Send Now
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(c.id)}>
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
