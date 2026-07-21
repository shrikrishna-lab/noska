import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeletedAccounts, useRestoreAccount, usePermanentDeleteAccount, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import type { DeletedAccount } from "@/lib/types";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const accountTypeColors: Record<string, "default" | "secondary"> = { user: "default", admin: "secondary" };

export function Trash() {
  const { data: accounts, isLoading } = useDeletedAccounts();
  const restoreAccount = useRestoreAccount();
  const permanentDeleteAccount = usePermanentDeleteAccount();
  const { confirm } = useConfirmDialog();
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  useRealtimeInvalidate(["admin", "deleted-accounts"], "deleted_accounts");

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
    } catch { toast.error("Failed to permanently delete account"); }
    setDeleting(null);
  };

  const columns: Column<DeletedAccount>[] = [
    { key: "name", label: "Account", sortable: true, render: (row) => (
      <div>
        <p className="font-medium">{row.name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{row.email || row.original_id}</p>
      </div>
    )},
    { key: "account_type", label: "Type", sortable: true, render: (row) => <Badge variant={accountTypeColors[row.account_type]}>{row.account_type}</Badge> },
    { key: "role", label: "Role", sortable: true, render: (row) => row.role ? <span className="text-xs text-muted-foreground capitalize">{row.role.replace(/_/g, " ")}</span> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "deleted_by_name", label: "Deleted By", sortable: true, render: (row) => <span className="text-muted-foreground">{row.deleted_by_name || "Unknown"}</span> },
    { key: "deleted_at", label: "Deleted At", sortable: true, render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.deleted_at)}</span> },
    { key: "restored_at", label: "Status", sortable: true, render: (row) => row.restored_at ? <Badge variant="success">Restored</Badge> : <Badge variant="destructive">Deleted</Badge> },
  ];

  const actionColumn: Column<DeletedAccount> = {
    key: "actions", label: "", className: "text-right w-[140px]",
    render: (row) => !row.restored_at ? (
      <div className="flex justify-end gap-1">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRestore(row)} disabled={restoring === row.id}>
          {restoring === row.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
          Restore
        </Button>
        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handlePermanentDelete(row)} disabled={deleting === row.id}>
          {deleting === row.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
        </Button>
      </div>
    ) : null,
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Trash" description="Restore or permanently delete accounts" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Trash" description="Deleted users and admin accounts — restore or permanently erase" />
      {accounts && accounts.length > 0 ? (
        <DataTable columns={[...columns, actionColumn]} data={accounts} searchPlaceholder="Search deleted accounts..." />
      ) : (
        <EmptyState title="Trash is empty" description="Deleted accounts will appear here when users or admins are deleted from the platform." />
      )}
    </div>
  );
}