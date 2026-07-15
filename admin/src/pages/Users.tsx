import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers, useBanUser, useHardBanUser, useDeleteUserData, useRealtimeInvalidate, type AdminUserRow } from "@/lib/queries";
import { formatRelativeTime, initialsFromName } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { AlertTriangle, Ban, Trash2, ShieldAlert, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

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

function BanModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [banType, setBanType] = useState<"soft" | "hard">("soft");
  const [submitting, setSubmitting] = useState(false);
  const banUser = useBanUser();
  const hardBanUser = useHardBanUser();
  const deleteUser = useDeleteUserData();

  const handleBan = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      if (banType === "hard") {
        await hardBanUser.mutateAsync({ user_id: user.id, reason });
        toast.success(`Hard banned ${user.user_name || user.email}`);
      } else {
        await banUser.mutateAsync({ user_id: user.id, reason, ban_type: "soft" });
        toast.success(`Banned ${user.user_name || user.email}`);
      }
      onClose();
    } catch {
      toast.error("Failed to ban user");
    }
    setSubmitting(false);
  };

  const handleDeleteData = async () => {
    if (!confirm("Delete ALL data for this user? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success("User data deleted");
      onClose();
    } catch {
      toast.error("Failed to delete user data");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> Ban User</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          <strong>{user.user_name || "Unnamed"}</strong> {user.email ? `<${user.email}>` : ""}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ban Type</Label>
            <Select value={banType} onValueChange={(v) => setBanType(v as "soft" | "hard")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Soft Ban — Restrict access, keep data</SelectItem>
                <SelectItem value="hard">Hard Ban — Delete all data & block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for ban..." />
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleBan} disabled={!reason.trim() || submitting} className="flex-1">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {banType === "hard" ? "Hard Ban" : "Soft Ban"}
            </Button>
            <Button variant="outline" onClick={handleDeleteData} disabled={submitting} className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Users() {
  const { data: users, isLoading } = useUsers();
  const { user } = useAuth();
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const canBan = user ? hasRole(user, "admin") : false;

  useRealtimeInvalidate(["admin", "users"], "user_profiles");

  const actionColumn: Column<AdminUserRow> = {
    key: "actions", label: "", className: "text-right w-[120px]",
    render: (row) => canBan ? (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setBanTarget(row)}>
          <Ban className="mr-1 h-3.5 w-3.5" /> Ban
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
      {banTarget && <BanModal user={banTarget} onClose={() => setBanTarget(null)} />}
    </div>
  );
}
