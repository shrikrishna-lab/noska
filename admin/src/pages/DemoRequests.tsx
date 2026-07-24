import { useState, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemoRequests, useRealtimeInvalidate, useUpdateDemoRequest, useDeleteDemoRequest } from "@/lib/queries";
import type { DemoRequest } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Mail, Trash2, Loader2, Check, X, Search, MessageSquare, Clock, Eye, ExternalLink, Copy, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "success" | "warning" | "destructive" | "outline"; color: string }> = {
  new: { label: "New", variant: "secondary", color: "text-blue-500" },
  contacted: { label: "Contacted", variant: "warning", color: "text-amber-500" },
  qualified: { label: "Qualified", variant: "default", color: "text-purple-500" },
  closed: { label: "Closed", variant: "success", color: "text-green-500" },
  lost: { label: "Lost", variant: "destructive", color: "text-red-500" },
};

export function DemoRequests() {
  const { data: requests, isLoading } = useDemoRequests();
  const updateMutation = useUpdateDemoRequest();
  const deleteMutation = useDeleteDemoRequest();
  const { confirm } = useConfirmDialog();
  useRealtimeInvalidate(["admin", "demo-requests"], "demo_requests");

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailNotes, setDetailNotes] = useState("");

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q) && !r.company?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requests, searchQuery, statusFilter]);

  const detail = useMemo(() => {
    if (!selectedRequest || !requests) return null;
    return requests.find((r) => r.id === selectedRequest) ?? null;
  }, [selectedRequest, requests]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    try {
      await updateMutation.mutateAsync({ id: selectedRequest, data: { notes: detailNotes } });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Delete Demo Request",
      description: `Delete request from ${name}? This cannot be undone.`,
      confirmText: "Delete",
      variant: "delete",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Deleted");
      if (selectedRequest === id) setSelectedRequest(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const columns: Column<DemoRequest>[] = [
    { key: "created_at", label: "Date", sortable: true, render: (row) => new Date(row.created_at).toLocaleDateString() },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "company", label: "Company", sortable: true },
    {
      key: "employees", label: "Size", sortable: true,
      render: (row) => <span className="text-muted-foreground text-sm">{row.employees} emp.</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? { label: row.status, variant: "secondary" as const, color: "" };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "id", label: "", sortable: false,
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id, row.name)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingState />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Demo Requests"
        description="Manage incoming sales demo requests"
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.success("Refreshing...")}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No demo requests" description="Requests from the enterprise page will appear here." />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {detail && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedRequest(null)}>
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Demo Request Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm font-medium">{detail.name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{detail.email}</p>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <p className="text-sm font-medium">{detail.company}</p>
                  </div>
                  <div>
                    <Label>Company Size</Label>
                    <p className="text-sm font-medium">{detail.employees} employees</p>
                  </div>
                </div>

                {detail.message && (
                  <div>
                    <Label>Message</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{detail.message}</p>
                  </div>
                )}

                <div>
                  <Label>Status</Label>
                  <Select
                    value={detail.status}
                    onValueChange={(v) => handleStatusChange(detail.id, v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    className="mt-1 min-h-[100px]"
                    placeholder="Add internal notes..."
                    value={detailNotes || detail.notes || ""}
                    onChange={(e) => setDetailNotes(e.target.value)}
                  />
                  <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Save Notes
                  </Button>
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  Created: {new Date(detail.created_at).toLocaleString()}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${detail.email}`}>
                      <Mail className="h-4 w-4 mr-2" /> Send Email
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setSelectedRequest(null); handleDelete(detail.id, detail.name); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
