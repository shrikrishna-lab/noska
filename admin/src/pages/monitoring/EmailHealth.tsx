import { motion } from "framer-motion";
import { Mail, RefreshCw, Send, CheckCircle, Eye, MousePointerClick, XCircle, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { useEmailMetrics, useRecentEmails, useEmailCampaigns } from "@/lib/monitoring/hooks";
import { formatNumber } from "@/lib/utils";
import type { Column } from "@/components/ui/DataTable";
import type { RecentEmail, EmailCampaignMetric } from "@/lib/monitoring/types";

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  opened: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  clicked: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  bounced: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function MonitoringEmailHealth() {
  const { data: emailMetrics, isLoading: mLoading, refetch, isRefetching } = useEmailMetrics();
  const { data: recent } = useRecentEmails();
  const { data: campaigns } = useEmailCampaigns();

  if (mLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Email Health" description="Delivery rates, opens, clicks, and campaign performance" />
        <LoadingState count={8} />
      </div>
    );
  }

  if (!emailMetrics) return null;

  const deliveryRate = emailMetrics.sent > 0 ? Math.round((emailMetrics.delivered / emailMetrics.sent) * 100) : 0;
  const openRate = emailMetrics.delivered > 0 ? Math.round((emailMetrics.opened / emailMetrics.delivered) * 100) : 0;
  const clickRate = emailMetrics.opened > 0 ? Math.round((emailMetrics.clicked / emailMetrics.opened) * 100) : 0;
  const bounceRate = emailMetrics.sent > 0 ? Math.round((emailMetrics.bounced / emailMetrics.sent) * 100) : 0;

  const recentColumns: Column<RecentEmail>[] = [
    { key: "to", label: "Recipient", sortable: true },
    { key: "subject", label: "Subject" },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge className={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: "sentAt", label: "Sent", sortable: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.sentAt).toLocaleString()}</span> },
  ];

  const campaignColumns: Column<EmailCampaignMetric>[] = [
    { key: "name", label: "Campaign", sortable: true },
    { key: "sent", label: "Sent", sortable: true, render: (row) => formatNumber(row.sent) },
    { key: "opened", label: "Opened", sortable: true, render: (row) => formatNumber(row.opened) },
    { key: "clicked", label: "Clicked", sortable: true, render: (row) => formatNumber(row.clicked) },
    { key: "bounced", label: "Bounced", sortable: true, render: (row) => formatNumber(row.bounced) },
    { key: "sentAt", label: "Date", sortable: true, render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.sentAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Email Health"
        description="Delivery rates, opens, clicks, and campaign performance"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard title="Sent" value={formatNumber(emailMetrics.sent)} icon={Send} />
        <KpiCard title="Delivered" value={formatNumber(emailMetrics.delivered)} icon={CheckCircle} />
        <KpiCard title="Opened" value={formatNumber(emailMetrics.opened)} icon={Eye} />
        <KpiCard title="Clicked" value={formatNumber(emailMetrics.clicked)} icon={MousePointerClick} />
        <KpiCard title="Failed" value={formatNumber(emailMetrics.failed)} icon={XCircle} />
        <KpiCard title="Bounced" value={formatNumber(emailMetrics.bounced)} icon={AlertTriangle} />
        <KpiCard title="Complaints" value={formatNumber(emailMetrics.complaint)} icon={AlertTriangle} />
        <KpiCard title="Spam" value={formatNumber(emailMetrics.spam)} icon={AlertTriangle} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Delivery Rate", value: `${deliveryRate}%`, color: deliveryRate > 97 ? "text-green-500" : deliveryRate > 90 ? "text-yellow-500" : "text-red-500" },
          { label: "Open Rate", value: `${openRate}%`, color: openRate > 40 ? "text-green-500" : openRate > 25 ? "text-yellow-500" : "text-red-500" },
          { label: "Click Rate", value: `${clickRate}%`, color: clickRate > 20 ? "text-green-500" : clickRate > 10 ? "text-yellow-500" : "text-red-500" },
          { label: "Bounce Rate", value: `${bounceRate}%`, color: bounceRate < 2 ? "text-green-500" : bounceRate < 5 ? "text-yellow-500" : "text-red-500" },
        ].map((r) => (
          <div key={r.label} className="rounded-xl border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${r.color}`}>{r.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Emails</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={recentColumns} data={recent ?? []} searchable={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={campaignColumns} data={campaigns ?? []} searchable={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
