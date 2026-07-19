import { useState, useCallback } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWaitlist, useWaitlistCount, useSendWaitlistInvite, useDeleteWaitlistEntry, useApproveWaitlistEntry, useRejectWaitlistEntry, type DbWaitlistEntry } from "@/lib/queries";
import { sendWaitlistInvite } from "@/lib/email";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Download, Mail, Trash2, Loader2, Check, X, Search, MessageSquare, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { supabase, getAdminToken } from "@/lib/supabase";

const statusColors: Record<string, "secondary" | "default" | "success" | "warning" | "destructive"> = {
  waiting: "secondary", invited: "default", accepted: "success", active: "success", rejected: "destructive",
};

function NotesModal({ entry, onClose }: { entry: DbWaitlistEntry; onClose: () => void }) {
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAdminToken();
      if (!token || !supabase) { toast.error("No session"); return; }
      await supabase.rpc("admin_update", {
        p_session_token: token, p_table: "waitlist_entries", p_id: entry.id,
        p_data: { notes },
      });
      toast.success("Notes saved");
      onClose();
    } catch { toast.error("Failed to save notes"); }
    setSaving(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes — {entry.name}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Add notes about this entry..." />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Notes
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function Waitlist() {
  const { confirm } = useConfirmDialog();
  const { data: entries, isLoading } = useWaitlist();
  const { data: count } = useWaitlistCount();
  const sendInvite = useSendWaitlistInvite();
  const deleteEntry = useDeleteWaitlistEntry();
  const approveEntry = useApproveWaitlistEntry();
  const rejectEntry = useRejectWaitlistEntry();
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notesEntry, setNotesEntry] = useState<DbWaitlistEntry | null>(null);

  const filtered = entries?.filter((e) =>
    !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e) => e.id)));
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.size) return;
    setBulkAction("approve");
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try { await approveEntry.mutateAsync(id); } catch { /* skip */ }
    }
    toast.success(`Approved ${ids.length} entries`);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const handleBulkReject = async () => {
    if (!selectedIds.size) return;
    setBulkAction("reject");
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try { await rejectEntry.mutateAsync(id); } catch { /* skip */ }
    }
    toast.success(`Rejected ${ids.length} entries`);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const downloadCSV = () => {
    if (!filtered?.length) return;
    const headers = "Name,Email,Provider,Country,Status,Position,Joined,Referral Count,Invite Code,Notes,Approved By,Approved At\n";
    const rows = filtered.map((e) =>
      `"${e.name}","${e.email}","${e.provider}","${e.country || ""}","${e.status}","${e.position ?? ""}","${e.joined_at || ""}","${e.referral_count}","${e.invite_code ?? ""}","${(e.notes ?? "").replace(/"/g, '""')}","${e.approved_by ?? ""}","${e.approved_at ?? ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "waitlist-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const columns: Column<DbWaitlistEntry>[] = [
    {
      key: "select", label: "",
      render: (row) => (
        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="h-4 w-4 rounded border-gray-300" />
      ),
    },
    { key: "name", label: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "email", label: "Email", sortable: true },
    { key: "provider", label: "Provider", sortable: true, hideOnMobile: true },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
    { key: "referral_count", label: "Refs", sortable: true, className: "text-right", hideOnMobile: true },
    { key: "invite_code", label: "Code", hideOnMobile: true, render: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.invite_code ?? "—"}</code> },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status === "waiting" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={async () => {
              try { await approveEntry.mutateAsync(row.id); toast.success(`${row.name} approved`); } catch { toast.error("Failed to approve"); }
            }} title="Approve"><Check className="h-3.5 w-3.5" /></Button>
          )}
          {row.status === "waiting" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
              try { await rejectEntry.mutateAsync(row.id); toast.success(`${row.name} rejected`); } catch { toast.error("Failed to reject"); }
            }} title="Reject"><X className="h-3.5 w-3.5" /></Button>
          )}
          {!row.invite_sent && row.status === "accepted" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
              setSending(row.id);
              try {
                const res = await sendWaitlistInvite({ waitlist_id: row.id, name: row.name, email: row.email });
                if (res.error) { toast.error(res.error); return; }
                await sendInvite.mutateAsync(row.id);
                toast.success(`Invite sent to ${row.name}`);
              } catch { toast.error("Failed to send invite"); }
              setSending(null);
            }} disabled={sending === row.id} title="Send invite">
              {sending === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNotesEntry(row)} title="Notes"><MessageSquare className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!await confirm({ title: "Remove from Waitlist", description: `Remove "${row.name}" from the waitlist? They will lose their spot.`, variant: "delete", confirmText: "Remove" })) return;
            setDeleting(row.id);
            try { await deleteEntry.mutateAsync(row.id); toast.success("Entry removed"); }
            catch { toast.error("Failed to remove entry"); }
            setDeleting(null);
          }} disabled={deleting === row.id} title="Delete">
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
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button variant="default" size="sm" className="text-green-600" onClick={handleBulkApprove} disabled={bulkAction === "approve"}>
                  {bulkAction === "approve" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                  Approve ({selectedIds.size})
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleBulkReject} disabled={bulkAction === "reject"}>
                  {bulkAction === "reject" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
                  Reject ({selectedIds.size})
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>
          </div>
        }
      />
      {filtered && filtered.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs h-8 text-sm"
          />
          <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={selectedIds.size === (filtered?.length ?? 0)} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-gray-300" />
              Select all {filtered?.length ?? 0}
            </label>
          </div>
        </div>
      )}
      {filtered && filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} searchPlaceholder="" />
      ) : (
        <EmptyState title={searchTerm ? "No matches" : "Waitlist is empty"} description={searchTerm ? "Try a different search term." : "Users who join the waitlist will appear here."} />
      )}
      {notesEntry && <NotesModal entry={notesEntry} onClose={() => setNotesEntry(null)} />}
    </div>
  );
}
