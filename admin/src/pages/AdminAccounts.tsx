import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";
import { useAdminUsers, useInviteAdmin, useDeleteAdmin, useUpdateAdminRole, type DbAdminUser, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { initialsFromName } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Shield, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const roleColors: Record<string, "default" | "destructive" | "secondary" | "success" | "warning"> = {
  super_admin: "destructive", admin: "default", developer: "secondary", support: "success", marketing: "warning",
};
const roleLabels: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", developer: "Developer", support: "Support", marketing: "Marketing",
};

function InviteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const inviteAdmin = useInviteAdmin();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      await inviteAdmin.mutateAsync({ name, email, role });
      if (SUPABASE_ENABLED && supabase) {
        const sessionToken = getAdminToken();
        const { error: pwdError } = await supabase.rpc("set_admin_password", { p_email: email, p_password: password, p_session_token: sessionToken });
        if (pwdError) throw new Error("Failed to set password: " + pwdError.message);
      }
      toast.success(`Invited ${name} as ${role}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to invite admin"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Admin</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin name" /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set login password" /></div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim() || !email.trim() || !password.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Invite Admin
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function AdminAccounts() {
  const { confirm } = useConfirmDialog();
  const { data: admins, isLoading } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const deleteAdmin = useDeleteAdmin();
  const updateRole = useUpdateAdminRole();
  const [showInvite, setShowInvite] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  useRealtimeInvalidate(["admin", "admin-accounts"], "admin_users");

  const columns: Column<DbAdminUser>[] = [
    {
      key: "name", label: "Admin", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px]">{initialsFromName(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role", label: "Role", sortable: true,
      render: (row) => editingRole === row.id ? (
        <div className="flex items-center gap-1">
          <Select defaultValue={row.role} onValueChange={async (val) => {
            try {
              await updateRole.mutateAsync({ id: row.id, role: val });
              toast.success(`Role updated to ${val}`);
            } catch { toast.error("Failed to update role"); }
            setEditingRole(null);
          }}>
            <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingRole(null)}><X className="h-3 w-3" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Badge variant={roleColors[row.role] ?? "secondary"}>{roleLabels[row.role] ?? row.role}</Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingRole(row.id)}><Shield className="h-3 w-3" /></Button>
        </div>
      ),
    },
    { key: "last_login", label: "Last Login", sortable: true, render: (row) => row.last_login ? <span className="text-muted-foreground text-xs">{new Date(row.last_login).toLocaleDateString()}</span> : <span className="text-muted-foreground text-xs">Never</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (currentUser?.id === row.id) { toast.error("You cannot delete your own account"); return; }
            if (!await confirm({ title: "Delete Admin", description: `Are you sure you want to delete "${row.name}"? This action cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
            try { await deleteAdmin.mutateAsync(row.id); toast.success("Admin deleted"); }
            catch { toast.error("Failed to delete admin"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Administrator Accounts" description="Manage platform administrators" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Administrator Accounts" description="Manage platform administrators" actions={<Button size="sm" onClick={() => setShowInvite(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Invite Admin</Button>} />
      {admins && admins.length > 0 ? (
        <DataTable columns={columns} data={admins} searchable={false} />
      ) : (
        <EmptyState title="No administrators" description="Administrator accounts will appear here once created." />
      )}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}