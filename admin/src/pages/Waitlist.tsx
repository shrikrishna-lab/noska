import { useState, useCallback, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useWaitlist, useWaitlistCount, useSendWaitlistInvite, useDeleteWaitlistEntry, useRejectWaitlistEntry, type DbWaitlistEntry } from "@/lib/queries";
import { sendWaitlistInvite } from "@/lib/email";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { Download, Mail, Trash2, Loader2, Check, X, Search, MessageSquare, ClipboardList, Clock, Eye, Link2, Copy, BarChart3, RefreshCw, Ban, UserX, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { supabase, getAdminToken } from "@/lib/supabase";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "success" | "warning" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "secondary", color: "text-gray-500" },
  approved: { label: "Approved", variant: "default", color: "text-blue-500" },
  invited: { label: "Invited", variant: "warning", color: "text-amber-500" },
  accepted: { label: "Accepted", variant: "success", color: "text-green-500" },
  expired: { label: "Expired", variant: "outline", color: "text-gray-400" },
  rejected: { label: "Rejected", variant: "destructive", color: "text-red-500" },
  banned: { label: "Banned", variant: "destructive", color: "text-red-700" },
  suspended: { label: "Suspended", variant: "outline", color: "text-orange-500" },
  waiting: { label: "Pending", variant: "secondary", color: "text-gray-500" },
};

const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-gray-400" },
  queued: { label: "Queued", color: "text-blue-400" },
  sent: { label: "Sent", color: "text-blue-500" },
  delivered: { label: "Delivered", color: "text-green-500" },
  opened: { label: "Opened", color: "text-green-600" },
  clicked: { label: "Clicked", color: "text-purple-500" },
  failed: { label: "Failed", color: "text-red-500" },
};

const TIMELINE_STEPS = [
  { key: "joined_at", label: "Joined Waitlist", icon: "📝" },
  { key: "approved_at", label: "Approved", icon: "✅" },
  { key: "email_sent_at", label: "Email Sent", icon: "📧" },
  { key: "email_opened_at", label: "Opened Email", icon: "👁️" },
  { key: "first_login_at", label: "Created Account", icon: "🔑" },
  { key: "workspace_created_at", label: "Workspace Created", icon: "🏢" },
];

function InviteTimeline({ entry }: { entry: DbWaitlistEntry }) {
  const dates: Record<string, string | null> = {
    joined_at: entry.joined_at,
    approved_at: entry.approved_at,
    email_sent_at: entry.email_sent_at,
    email_opened_at: entry.email_opened_at,
    first_login_at: entry.first_login_at,
    workspace_created_at: entry.workspace_created_at,
  };
  let found = false;
  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step) => {
        const date = dates[step.key];
        if (date) found = true;
        return (
          <div key={step.key} className="flex items-center gap-2 py-1">
            <span className="text-xs">{step.icon}</span>
            <span className="text-xs" style={{ opacity: date ? 1 : 0.3 }}>{step.label}</span>
            {date && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(date).toLocaleDateString()}</span>}
          </div>
        );
      })}
      {!found && <p className="text-xs text-muted-foreground py-1">No timeline events yet</p>}
    </div>
  );
}

function InvitePreviewModal({ entry, onClose }: { entry: DbWaitlistEntry; onClose: () => void }) {
  const inviteLink = entry.invite_code ? `https://noska.me/invite/${entry.invite_code}` : null;
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Invitation — {entry.name}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="mb-2 text-sm font-medium">Email Preview</div>
              <div className="rounded-lg border bg-background p-4 text-sm">
                <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "0 auto" }}>
                  <h2 style={{ marginTop: 0 }}>You're in! Welcome to Noska 🎉</h2>
                  <p>Hey {entry.name},</p>
                  <p>Great news — you've been approved! Click below to create your account.</p>
                  <div style={{ margin: "24px 0", textAlign: "center" }}>
                    <a href={inviteLink ?? "#"} style={{ display: "inline-block", padding: "12px 24px", backgroundColor: "#7c3aed", color: "white", textDecoration: "none", borderRadius: 8 }}>
                      Create Account
                    </a>
                  </div>
                  {entry.invite_code && (
                    <p style={{ color: "#6b7280", fontSize: 12 }}>
                      Your invite code: <strong>{entry.invite_code}</strong>
                    </p>
                  )}
                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />
                  <p style={{ color: "#6b7280", fontSize: 12 }}>
                    This invite expires in 7 days. If you didn't request this, ignore this email.
                  </p>
                </div>
              </div>
            </div>

            {inviteLink && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(inviteLink!, "_blank")}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Open Invite
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(inviteLink!)}>
                  {copied ? <><Check className="mr-1 h-3.5 w-3.5" /> Copied</> : <><Link2 className="mr-1 h-3.5 w-3.5" /> Copy Link</>}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(entry.invite_code ?? "")}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy Token
                </Button>
              </div>
            )}

            {entry.invite_expires_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Expires: {new Date(entry.invite_expires_at).toLocaleDateString()} ({Math.max(0, Math.ceil((new Date(entry.invite_expires_at).getTime() - Date.now()) / 86400000))} days)
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

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
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  const { data: entries, isLoading, refetch, isRefetching } = useWaitlist();
  const { data: count } = useWaitlistCount();
  const sendInvite = useSendWaitlistInvite();
  const deleteEntry = useDeleteWaitlistEntry();
  const rejectEntry = useRejectWaitlistEntry();
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [notesEntry, setNotesEntry] = useState<DbWaitlistEntry | null>(null);
  const [previewEntry, setPreviewEntry] = useState<DbWaitlistEntry | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const countries = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.country).filter(Boolean))) as string[];
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase()) && !e.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterCountry !== "all" && e.country !== filterCountry) return false;
      return true;
    });
  }, [entries, searchTerm, filterStatus, filterCountry]);

  const isExpired = (entry: DbWaitlistEntry) => {
    if (entry.invite_expires_at && new Date(entry.invite_expires_at) < new Date()) return true;
    return false;
  };

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

  const handleApprove = async (row: DbWaitlistEntry) => {
    try {
      const token = getAdminToken();
      if (!token) { toast.error("No session"); return; }
      await supabase?.functions.invoke("approve-waitlist", {
        body: { waitlist_id: row.id, admin_name: row.name },
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${row.name} approved & invited`);
    } catch { toast.error("Failed to approve"); }
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.size) return;
    setBulkAction("approve");
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const entry = entries?.find((e) => e.id === id);
      if (entry) await handleApprove(entry);
    }
    toast.success(`Approved ${ids.length} entries`);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const handleBulkReject = async () => {
    if (!selectedIds.size) return;
    if (!await confirm({ title: "Reject entries", description: `Reject ${selectedIds.size} selected entries?`, variant: "delete", confirmText: "Reject All", destructive: true })) return;
    setBulkAction("reject");
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try { await rejectEntry.mutateAsync(id); } catch { /* skip */ }
    }
    toast.success(`Rejected ${ids.length} entries`);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!await confirm({ title: "Delete entries", description: `Permanently delete ${selectedIds.size} selected entries?`, variant: "delete", confirmText: "Delete All" })) return;
    setBulkAction("delete");
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try { await deleteEntry.mutateAsync(id); } catch { /* skip */ }
    }
    toast.success(`Deleted ${ids.length} entries`);
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const downloadCSV = () => {
    if (!filtered?.length) return;
    const headers = "Name,Email,Provider,Country,Status,Position,Joined,Referral Count,Invite Code,Invite Expires,Email Status,Notes,Approved By,Approved At\n";
    const rows = filtered.map((e) =>
      `"${e.name}","${e.email}","${e.provider}","${e.country || ""}","${e.status}","${e.position ?? ""}","${e.joined_at || ""}","${e.referral_count}","${e.invite_code ?? ""}","${e.invite_expires_at || ""}","${e.email_status || ""}","${(e.notes ?? "").replace(/"/g, '""')}","${e.approved_by ?? ""}","${e.approved_at ?? ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "waitlist-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const statusCounts = useMemo(() => {
    if (!entries) return {};
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.status] = (counts[e.status] || 0) + 1;
    return counts;
  }, [entries]);

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
    {
      key: "status", label: "Status", sortable: true,
      render: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
        const expired = row.status === "invited" && isExpired(row);
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={expired ? "outline" : cfg.variant}>{expired ? "Expired" : cfg.label}</Badge>
            {row.email_status && row.email_status !== "pending" && (
              <span className={`text-[10px] ${EMAIL_STATUS_CONFIG[row.email_status]?.color ?? ""}`}>
                {EMAIL_STATUS_CONFIG[row.email_status]?.label ?? row.email_status}
              </span>
            )}
          </div>
        );
      },
    },
    { key: "referral_count", label: "Refs", sortable: true, className: "text-right", hideOnMobile: true },
    {
      key: "invite_code", label: "Code", hideOnMobile: true,
      render: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.invite_code ?? "—"}</code>,
    },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => {
        const expired = row.status === "invited" && isExpired(row);
        return (
          <div className="flex justify-end gap-1">
            {(row.status === "waiting" || row.status === "pending") && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(row)} title="Approve & invite">
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {(row.status === "waiting" || row.status === "pending") && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                try { await rejectEntry.mutateAsync(row.id); toast.success(`${row.name} rejected`); } catch { toast.error("Failed to reject"); }
              }} title="Reject">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {(row.status === "invited" || expired) && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                setSending(row.id);
                try {
                  const res = await sendWaitlistInvite({ waitlist_id: row.id, name: row.name, email: row.email });
                  if (res.error) { toast.error(res.error); return; }
                  await sendInvite.mutateAsync(row.id);
                  toast.success(`Invite ${expired ? "re-sent" : "sent"} to ${row.name}`);
                } catch { toast.error("Failed to send invite"); }
                setSending(null);
              }} disabled={sending === row.id} title={expired ? "Resend invite" : "Resend invite"}>
                {sending === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewEntry(row)} title="Preview invitation">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNotesEntry(row)} title="Notes">
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
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
        );
      },
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Waitlist" description="User registration waitlist" /><LoadingState count={5} /></div>;

  if (showAnalytics) {
    const total = entries?.length ?? 0;
    const approved = entries?.filter((e) => ["approved", "invited", "accepted"].includes(e.status)).length ?? 0;
    const accepted = entries?.filter((e) => e.status === "accepted").length ?? 0;
    const todaySignups = entries?.filter((e) => e.joined_at && new Date(e.joined_at).toDateString() === new Date().toDateString()).length ?? 0;
    const conversion = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const topReferrers = entries?.filter((e) => e.referral_count > 0).sort((a, b) => b.referral_count - a.referral_count).slice(0, 5) ?? [];
    const countryData = entries?.reduce((acc, e) => { if (e.country) acc[e.country] = (acc[e.country] || 0) + 1; return acc; }, {} as Record<string, number>) ?? {};

    return (
      <div className="p-6">
        <PageHeader title="Waitlist Analytics" description="Metrics and insights" actions={
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(false)}><BarChart3 className="mr-1 h-3.5 w-3.5" /> Back to Waitlist</Button>
        } />
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">Total Waitlist</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{todaySignups}</div><div className="text-xs text-muted-foreground">Today's Signups</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{approved}</div><div className="text-xs text-muted-foreground">Approvals</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{conversion}%</div><div className="text-xs text-muted-foreground">Conversion Rate</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{accepted}</div><div className="text-xs text-muted-foreground">Accepted Invites</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{(statusCounts["waiting"] ?? 0) + (statusCounts["pending"] ?? 0)}</div><div className="text-xs text-muted-foreground">Pending</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{Object.keys(countryData).length}</div><div className="text-xs text-muted-foreground">Countries</div></div>
          <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{topReferrers.length}</div><div className="text-xs text-muted-foreground">Top Referrers</div></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(statusCounts).map(([s, c]) => (
                <div key={s} className="flex items-center gap-2">
                  <Badge variant={STATUS_CONFIG[s]?.variant ?? "secondary"}>{STATUS_CONFIG[s]?.label ?? s}</Badge>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${total > 0 ? (c / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Countries</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(countryData).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, c]) => (
                <div key={country} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{country}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(c / total) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{c}</span>
                </div>
              ))}
              {Object.keys(countryData).length === 0 && <p className="text-sm text-muted-foreground">No country data</p>}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Top Referrers</h3>
            <div className="space-y-2">
              {topReferrers.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">({r.email})</span>
                  <span className="ml-auto text-xs font-mono">{r.referral_count} refs</span>
                </div>
              ))}
              {topReferrers.length === 0 && <p className="text-sm text-muted-foreground">No referrals yet</p>}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1">Avg time from signup to approval</span>
                <span className="text-xs text-muted-foreground">
                  {entries ? (() => {
                    const approved = entries.filter((e) => e.joined_at && e.approved_at);
                    if (!approved.length) return "—";
                    const avg = approved.reduce((sum, e) => sum + (new Date(e.approved_at!).getTime() - new Date(e.joined_at!).getTime()), 0) / approved.length;
                    const days = Math.floor(avg / 86400000);
                    const hours = Math.floor((avg % 86400000) / 3600000);
                    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                  })() : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1">Invite expiration</span>
                <span className="text-xs text-muted-foreground">7 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Waitlist"
        description={`${count ?? 0} total · ${(statusCounts["waiting"] ?? 0) + (statusCounts["pending"] ?? 0)} pending · ${statusCounts["accepted"] ?? 0} accepted`}
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
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleBulkDelete} disabled={bulkAction === "delete"}>
                  {bulkAction === "delete" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                  Delete ({selectedIds.size})
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/waitlist-analytics")}><BarChart3 className="mr-1 h-3.5 w-3.5" /> Analytics</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="all">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
          <input type="checkbox" checked={selectedIds.size === (filtered?.length ?? 0)} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-gray-300" />
          Select all {filtered?.length ?? 0}
        </div>
      </div>

      {filtered && filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} searchPlaceholder="" />
      ) : (
        <EmptyState title={searchTerm || filterStatus !== "all" || filterCountry !== "all" ? "No matches" : "Waitlist is empty"} description="Try different filters or wait for new signups." />
      )}

      {notesEntry && <NotesModal entry={notesEntry} onClose={() => setNotesEntry(null)} />}
      {previewEntry && <InvitePreviewModal entry={previewEntry} onClose={() => setPreviewEntry(null)} />}
    </div>
  );
}

export function WaitlistAnalytics() {
  return null;
}
