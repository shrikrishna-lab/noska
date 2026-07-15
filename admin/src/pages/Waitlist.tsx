import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWaitlist, useWaitlistCount, useSendWaitlistInvite, useDeleteWaitlistEntry, type DbWaitlistEntry } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Download, Mail, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

const statusColors: Record<string, "secondary" | "default" | "success" | "warning"> = {
  waiting: "secondary", invited: "default", accepted: "success", skipped: "warning",
};

export function Waitlist() {
  const { data: entries, isLoading } = useWaitlist();
  const { data: count } = useWaitlistCount();
  const sendInvite = useSendWaitlistInvite();
  const deleteEntry = useDeleteWaitlistEntry();
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const downloadCSV = () => {
    if (!entries?.length) return;
    const headers = "Name,Email,Provider,Country,Status,Position,Joined,Referral Count\n";
    const rows = entries.map((e) => `"${e.name}","${e.email}","${e.provider}","${e.country || ""}","${e.status}","${e.position ?? ""}","${e.joined_at || ""}","${e.referral_count}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "waitlist-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const columns: Column<DbWaitlistEntry>[] = [
    { key: "name", label: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "email", label: "Email", sortable: true },
    { key: "provider", label: "Provider", sortable: true, hideOnMobile: true },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
    { key: "referral_count", label: "Referrals", sortable: true, className: "text-right" },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
            if (row.invite_sent) { toast("Invite already sent"); return; }
            setSending(row.id);
            try { await sendInvite.mutateAsync(row.id); toast.success(`Invite sent to ${row.name}`); }
            catch { toast.error("Failed to send invite"); }
            setSending(null);
          }} disabled={sending === row.id}>
            {sending === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Remove "${row.name}" from waitlist?`)) return;
            setDeleting(row.id);
            try { await deleteEntry.mutateAsync(row.id); toast.success("Entry removed"); }
            catch { toast.error("Failed to remove entry"); }
            setDeleting(null);
          }} disabled={deleting === row.id}>
            {deleting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Waitlist" description="User registration waitlist" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Waitlist"
        description={`${count ?? 0} users waiting`}
        actions={<Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>}
      />
      {entries && entries.length > 0 ? (
        <DataTable columns={columns} data={entries} searchPlaceholder="Search waitlist..." />
      ) : (
        <EmptyState title="Waitlist is empty" description="Users who join the waitlist will appear here." />
      )}
    </div>
  );
}