import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmailCampaigns, useDeleteEmailCampaign } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmailCampaign } from "@/lib/types";
import { Plus, Copy, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success"> = {
  draft: "secondary", scheduled: "warning", sending: "default", sent: "success",
};

export function EmailCampaigns() {
  const { data: campaigns, isLoading } = useEmailCampaigns();
  const deleteCampaign = useDeleteEmailCampaign();
  const [deleting, setDeleting] = useState<string | null>(null);

  const columns: Column<EmailCampaign>[] = [
    { key: "name", label: "Campaign", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
    { key: "recipients", label: "Recipients", sortable: true, className: "text-right" },
    { key: "sent", label: "Sent", sortable: true, className: "text-right", hideOnMobile: true },
    { key: "open_rate", label: "Open Rate", sortable: true, className: "text-right", render: (row) => `${row.open_rate}%`, hideOnMobile: true },
    { key: "sent_at", label: "Sent", sortable: true, render: (row) => row.sent_at ? <span className="text-muted-foreground">{formatRelativeTime(row.sent_at)}</span> : <span className="text-muted-foreground">—</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete campaign "${row.name}"?`)) return;
            setDeleting(row.id);
            try { await deleteCampaign.mutateAsync(row.id); toast.success("Campaign deleted"); }
            catch { toast.error("Failed to delete campaign"); }
            setDeleting(null);
          }} disabled={deleting === row.id}>
            {deleting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Email Campaigns" description="Manage email campaigns" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Email Campaigns" description="Manage email campaigns and newsletters" actions={<Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Create Campaign</Button>} />
      {campaigns && campaigns.length > 0 ? (
        <DataTable columns={columns} data={campaigns} searchPlaceholder="Search campaigns..." />
      ) : (
        <EmptyState title="No campaigns" description="Email campaigns will appear here once created." />
      )}
    </div>
  );
}