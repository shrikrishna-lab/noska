import { useState, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDeletedAccounts, useRestoreAccount, usePermanentDeleteAccount, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import type { DeletedAccount } from "@/lib/types";
import { RotateCcw, Trash2, Loader2, Eye, X, Search, Trash2 as TrashIcon } from "lucide-react";
import toast from "react-hot-toast";

const accountTypeColors: Record<string, "default" | "secondary"> = { user: "default", admin: "secondary" };

export function Trash() {
  const { data: accounts, isLoading } = useDeletedAccounts();
  const restoreAccount = useRestoreAccount();
  const permanentDeleteAccount = usePermanentDeleteAccount();
  const { confirm } = useConfirmDialog();
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "deleted" | "restored">("all");
  const [searchQuery, setSearchQuery] = useState("");
  useRealtimeInvalidate(["admin", "deleted-accounts"], "deleted_accounts");

  const filtered = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((a) => {
      if (filterStatus === "deleted" && a.restored_at) return false;
      if (filterStatus === "restored" && !a.restored_at) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.name?.toLowerCase().includes(q) && !a.email?.toLowerCase().includes(q) && !a.original_id?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [accounts, filterStatus, searchQuery]);

  const selected = useMemo(() => {
    if (!selectedId || !accounts) return null;
    return accounts.find((a) => a.id === selectedId) ?? null;
  }, [selectedId, accounts]);

  const handleRestore = async (account: DeletedAccount) => {
    if (!await confirm({ title: "Restore Account", description: `Restore "${account.name || account.email || account.original_id}" as a ${account.account_type}?`, variant: "confirm", confirmText: "Restore" })) return;
    setRestoring(account.id);
    try {
      await restoreAccount.mutateAsync(account.id);
      toast.success(`${account.account_type === "admin" ? "Admin" : "User"} restored`);
    } catch { toast.error("Failed to restore account"); }
    setRestoring(null);
  };

  const handlePermanentDelete = async (account: DeletedAccount) => {
    if (!await confirm({ title: "Permanently Delete", description: `Permanently delete "${account.name || account.email || account.original_id}"? This cannot be undone.`, variant: "delete", confirmText: "Delete Forever" })) return;
    setDeleting(account.id);
    try {
      await permanentDeleteAccount.mutateAsync(account.id);
      toast.success("Account permanently deleted");
      if (selectedId === account.id) setSelectedId(null);
    } catch { toast.error("Failed to permanently delete account"); }
    setDeleting(null);
  };

  const columns: Column<DeletedAccount>[] = [
    { key: "name", label: "Account", sortable: true, className: "w-[200px]", render: (row) => (
      <div>
        <p className="font-medium">{row.name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{row.email || row.original_id}</p>
      </div>
    )},
    { key: "account_type", label: "Type", sortable: true, className: "w-[90px]", render: (row) => <Badge variant={accountTypeColors[row.account_type]}>{row.account_type}</Badge> },
    { key: "role", label: "Role", sortable: true, className: "w-[100px]", render: (row) => row.role ? <span className="text-xs text-muted-foreground capitalize">{row.role.replace(/_/g, " ")}</span> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "deleted_by_name", label: "Deleted By", sortable: true, className: "w-[120px]", render: (row) => <span className="text-muted-foreground">{row.deleted_by_name || "Unknown"}</span> },
    { key: "deleted_at", label: "Deleted At", sortable: true, className: "w-[110px]", render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.deleted_at)}</span> },
    { key: "restored_at", label: "Status", sortable: true, className: "w-[110px]", render: (row) => row.restored_at ? <Badge variant="success">Restored {row.restored_at ? formatRelativeTime(row.restored_at) : ""}</Badge> : <Badge variant="destructive">Deleted</Badge> },
    {
      key: "id", label: "", sortable: false, className: "w-[110px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedId(row.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {!row.restored_at && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleRestore(row)} disabled={restoring === row.id}>
                {restoring === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handlePermanentDelete(row)} disabled={deleting === row.id}>
                {deleting === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Trash" description="Restore or permanently delete accounts" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Trash"
        description={`${accounts?.length ?? 0} deleted accounts — restore or permanently erase`}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 border rounded-md p-0.5">
          {(["all", "deleted", "restored"] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setFilterStatus(f)}
            >
              {f === "all" ? "All" : f === "deleted" ? "Deleted" : "Restored"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={TrashIcon} title="Trash is empty" description="Deleted accounts will appear here when users or admins are deleted from the platform." />
      ) : (
        <DataTable columns={columns} data={filtered} searchable={false} />
      )}

      {selected && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedId(null)}>
            <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Account Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm font-medium">{selected.name || "Unknown"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{selected.email || "—"}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Badge variant={accountTypeColors[selected.account_type]}>{selected.account_type}</Badge>
                  </div>
                  <div>
                    <Label>Original ID</Label>
                    <p className="text-xs font-mono text-muted-foreground break-all">{selected.original_id}</p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <p className="text-sm text-muted-foreground capitalize">{selected.role?.replace(/_/g, " ") || "—"}</p>
                  </div>
                  <div>
                    <Label>Deleted By</Label>
                    <p className="text-sm text-muted-foreground">{selected.deleted_by_name || "Unknown"}</p>
                  </div>
                  <div>
                    <Label>Deleted At</Label>
                    <p className="text-sm text-muted-foreground">{new Date(selected.deleted_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    {selected.restored_at ? <Badge variant="success">Restored</Badge> : <Badge variant="destructive">Deleted</Badge>}
                  </div>
                  {selected.restored_at && (
                    <>
                      <div>
                        <Label>Restored At</Label>
                        <p className="text-sm text-muted-foreground">{new Date(selected.restored_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Restored By</Label>
                        <p className="text-sm text-muted-foreground">{selected.restored_by_admin_id || "—"}</p>
                      </div>
                    </>
                  )}
                </div>

                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <Label>Metadata</Label>
                    <pre className="mt-1 rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {!selected.restored_at && (
                    <>
                      <Button variant="default" size="sm" onClick={() => handleRestore(selected)} disabled={restoring === selected.id}>
                        {restoring === selected.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                        Restore
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(selected)} disabled={deleting === selected.id}>
                        {deleting === selected.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete Forever
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}