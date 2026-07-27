import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUsers, useBanUser, useHardBanUser, useDeleteUserData, useRealtimeInvalidate, type AdminUserRow } from "@/lib/queries";
import { formatRelativeTime, initialsFromName } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { Ban, Trash2 } from "lucide-react";
import { useCommandCenter } from "@/components/ui/AdminCommandCenter";

const columns: Column<AdminUserRow>[] = [
  {
    key: "user_name", label: "User", sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-[10px]">{initialsFromName(row.user_name || row.email || "?")}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{row.user_name || "Unnamed"}</p>
          <p className="text-xs text-muted-foreground">{row.email || row.username || "No email"}</p>
        </div>
      </div>
    ),
  },
  { key: "username", label: "Username", sortable: true, render: (row) => row.username || <span className="text-muted-foreground">—</span>, hideOnMobile: true },
  { key: "created_at", label: "Joined", sortable: true, render: (row) => row.created_at ? <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> : "—" },
];

export function Users() {
  const { data: users, isLoading } = useUsers();
  const { user } = useAuth();
  const { trigger, showSuccess } = useCommandCenter();
  const canBan = user ? hasRole(user, "admin") : false;

  const banUser = useBanUser();
  const hardBanUser = useHardBanUser();
  const deleteUser = useDeleteUserData();

  useRealtimeInvalidate(["admin", "users"], "user_profiles");

  const actionColumn: Column<AdminUserRow> = {
    key: "actions", label: "", className: "text-right w-[180px]",
    render: (row) => canBan ? (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            trigger({
              type: "ban_user",
              meta: { email: row.email || row.username || "User Account" },
                onConfirm: async (payload) => {
                try {
                  const reason = payload?.input || "No reason specified";
                  const isPermanent = payload?.duration === "permanent";
                  if (isPermanent) {
                    await hardBanUser.mutateAsync({ user_id: row.id, reason });
                  } else {
                    await banUser.mutateAsync({ user_id: row.id, reason, ban_type: "soft", expires_at: payload?.duration === "7_days" ? new Date(Date.now() + 7 * 86400000).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString() });
                  }
                  showSuccess(`Banned user ${row.user_name || row.email}`);
                } catch { showSuccess("Ban failed"); }
              }
            });
          }}
        >
          <Ban className="mr-1 h-3.5 w-3.5" /> Ban
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive"
          onClick={() => {
            trigger({
              type: "delete_user",
              meta: { email: row.email || row.username || "User Account" },
              onConfirm: async () => {
                try {
                  await deleteUser.mutateAsync(row.id);
                  showSuccess(`Deleted user data for ${row.user_name || row.email}`);
                } catch { showSuccess("Delete failed"); }
              }
            });
          }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    ) : null,
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Users" description="Manage all platform users — updates in real time" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Users" description="Manage all platform users — ban, hard ban, or delete user data" />
      {users && users.length > 0 ? (
        <DataTable columns={[...columns, actionColumn]} data={users} searchPlaceholder="Search users..." />
      ) : (
        <EmptyState title="No users found" description="User profiles will appear here once users sign up." />
      )}
    </div>
  );
}

