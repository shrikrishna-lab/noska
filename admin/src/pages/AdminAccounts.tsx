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
import { Plus, Shield, Trash2, X, Loader2, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";

const roleColors: Record<string, "default" | "destructive" | "secondary" | "success" | "warning"> = {
  super_admin: "destructive", admin: "default", developer: "secondary", support: "success", marketing: "warning",
};
const roleLabels: Record<string, string> = ROLE_LABELS;

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
  const [search, setSearch] = useState("");
  useRealtimeInvalidate(["admin", "admin-accounts"], "admin_users");

  const filtered = (admins ?? []).filter((a) => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  const stats = {
    total: admins?.length ?? 0,
    superAdmins: admins?.filter((a) => a.role === "super_admin").length ?? 0,
    active: admins?.filter((a) => a.last_login).length ?? 0,
    byRole: {} as Record<string, number>,
  };
  admins?.forEach((a) => { stats.byRole[a.role] = (stats.byRole[a.role] ?? 0) + 1; });

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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{stats.total}</p></div><p className="text-xs text-muted-foreground">Total admins</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-destructive" /><p className="text-2xl font-bold">{stats.superAdmins}</p></div><p className="text-xs text-muted-foreground">Super admins</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-emerald-500" /><p className="text-2xl font-bold">{stats.active}</p></div><p className="text-xs text-muted-foreground">Ever logged in</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" /><p className="text-2xl font-bold">{stats.byRole.support ?? 0}</p></div><p className="text-xs text-muted-foreground">Support team</p></CardContent></Card>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search admins by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} searchable={false} />
      ) : (
        <EmptyState title={search ? "No matching admins" : "No administrators"} description={search ? "Try a different search term." : "Administrator accounts will appear here once created."} />
      )}
      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="mb-4"><h2 className="text-sm font-semibold">Role access matrix</h2><p className="text-xs text-muted-foreground">Permission presets are enforced again by Supabase RPCs for every mutation.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(ROLE_CAPABILITIES).map(([role, capabilities]) => (
            <div key={role} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><Badge variant={roleColors[role] ?? "secondary"}>{roleLabels[role] ?? role}</Badge><span className="text-[11px] text-muted-foreground">{capabilities.length} areas</span></div>
              <p className="mb-2 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]}</p>
              <div className="flex flex-wrap gap-1">{capabilities.map((capability) => <span key={capability} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{capability.replaceAll("_", " ")}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
