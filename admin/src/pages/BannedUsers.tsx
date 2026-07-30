import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBannedUsers, useUnbanUser, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BannedUser } from "@/lib/types";
import { ShieldOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const banTypeColors: Record<string, "destructive" | "warning"> = { hard: "destructive", soft: "warning" };

const columns: Column<BannedUser>[] = [
  { key: "email", label: "User", sortable: true, className: "w-[200px]", render: (row) => (
    <div>
      <p className="font-medium">{row.user_name || "Unknown"}</p>
      <p className="text-xs text-muted-foreground">{row.email}</p>
    </div>
  )},
  { key: "ban_type", label: "Type", sortable: true, className: "w-[90px]", render: (row) => <Badge variant={banTypeColors[row.ban_type] ?? "default"}>{row.ban_type}</Badge> },
  { key: "reason", label: "Reason", sortable: true, className: "w-[180px]", render: (row) => <span className="max-w-[180px] truncate block">{row.reason}</span> },
  { key: "expires_at", label: "Expires", sortable: true, className: "w-[110px]", render: (row) => row.expires_at ? <span className="text-muted-foreground">{formatRelativeTime(row.expires_at)}</span> : <span className="text-muted-foreground">Permanent</span> },
  { key: "created_at", label: "Banned At", sortable: true, className: "w-[110px]", render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span> },
  { key: "lifted_at", label: "Status", sortable: true, className: "w-[90px]", render: (row) => row.lifted_at ? <Badge variant="success">Lifted</Badge> : <Badge variant="destructive">Active</Badge> },
];

export function BannedUsers() {
  const { data: banned, isLoading } = useBannedUsers();
  const unbanUser = useUnbanUser();
  const [unbanning, setUnbanning] = useState<string | null>(null);
  useRealtimeInvalidate(["admin", "banned-users"], "user_profiles");
  useRealtimeInvalidate(["admin", "banned-users"], "banned_users");

  const handleUnban = async (userId: string) => {
    setUnbanning(userId);
    try {
      await unbanUser.mutateAsync(userId);
      toast.success("User unbanned successfully");
    } catch {
      toast.error("Failed to unban user");
    }
    setUnbanning(null);
  };

  const actionColumn: Column<BannedUser> = {
    key: "actions", label: "", className: "text-right w-[100px]",
    render: (row) => !row.lifted_at ? (
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUnban(row.user_id)} disabled={unbanning === row.user_id}>
        {unbanning === row.user_id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ShieldOff className="mr-1 h-3 w-3" />}
        Unban
      </Button>
    ) : null,
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Banned Users" description="Manage banned platform users" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Banned Users" description="View and manage banned users — soft bans restrict access, hard bans also delete user data" />
      {banned && banned.length > 0 ? (
        <DataTable columns={[...columns, actionColumn]} data={banned} searchPlaceholder="Search banned users..." />
      ) : (
        <EmptyState title="No banned users" description="Banned users will appear here when users are banned from the platform." />
      )}
    </div>
  );
}
