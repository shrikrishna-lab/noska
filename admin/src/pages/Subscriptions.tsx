import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscriptions, useProvisionSubscription, useRealtimeInvalidate, type DbSubscription } from "@/lib/queries";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { DollarSign, CreditCard, TrendingUp, Users, Plus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  active: "success", past_due: "warning", canceled: "destructive", trialing: "default", paused: "secondary",
};

const columns: Column<DbSubscription>[] = [
  { key: "customer_name", label: "Customer", sortable: true, className: "w-[160px]", render: (row) => <span className="font-medium">{row.customer_name}</span> },
  { key: "email", label: "Email", sortable: true, className: "w-[200px]", render: (row) => row.email || "—", hideOnMobile: true },
  { key: "plan", label: "Plan", sortable: true, className: "w-[100px]", render: (row) => <Badge variant={row.plan === "enterprise" ? "success" : row.plan === "pro" ? "default" : "secondary"}>{row.plan}</Badge> },
  { key: "mrr", label: "MRR", sortable: true, render: (row) => formatCurrency(row.mrr ?? 0), className: "text-right w-[80px]" },
  { key: "status", label: "Status", sortable: true, className: "w-[100px]", render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
  { key: "started_at", label: "Started", sortable: true, className: "w-[110px]", render: (row) => row.started_at ? <span className="text-muted-foreground">{formatRelativeTime(row.started_at)}</span> : "—", hideOnMobile: true },
  { key: "renews_at", label: "Renews", sortable: true, className: "w-[110px]", render: (row) => row.renews_at ? <span className="text-muted-foreground">{formatRelativeTime(row.renews_at)}</span> : "—", hideOnMobile: true },
];

function ProvisionModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("pro");
  const [mrr, setMrr] = useState("29");
  const [durationDays, setDurationDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const provision = useProvisionSubscription();

  const handleProvision = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const renews = new Date(now.getTime() + parseInt(durationDays || "30") * 86400000);
      await provision.mutateAsync({
        customer_name: name,
        email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        plan,
        mrr: parseFloat(mrr) || 0,
        started_at: now.toISOString(),
        renews_at: renews.toISOString(),
        payment_method: "admin_provisioned",
        status: "active",
      });
      toast.success(`Provisioned ${plan} subscription for ${name} (${durationDays} days)`);
      onClose();
    } catch { toast.error("Failed to provision subscription"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Provision Subscription</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Customer Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" /></div>
          <div className="space-y-2"><Label>Email (optional)</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => { setPlan(v); if (v === "free") setMrr("0"); else if (v === "pro") setMrr("29"); else setMrr("99"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro ($29/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($99/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>MRR ($)</Label><Input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="30" /></div>
          <p className="text-xs text-muted-foreground">
            Creates a {durationDays || "30"}-day subscription starting now, renewing on {new Date(Date.now() + parseInt(durationDays || "30") * 86400000).toLocaleDateString()}. 
            Useful for testing, internal users, and special access grants.
          </p>
          <Button className="w-full" onClick={handleProvision} disabled={!name.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Provision Subscription
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function Subscriptions() {
  const { data: subs, isLoading } = useSubscriptions();
  useRealtimeInvalidate(["admin", "subscriptions"], "subscriptions");
  const [showProvision, setShowProvision] = useState(false);
  const totalMrr = (subs ?? []).reduce((s, sub) => s + (sub.mrr ?? 0), 0);
  const activeCount = (subs ?? []).filter((s) => s.status === "active").length;
  const canceledCount = (subs ?? []).filter((s) => s.status === "canceled").length;

  if (isLoading) return <div className="p-6"><PageHeader title="Subscriptions" description="Manage customer subscriptions" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Subscriptions" description="Manage customer subscriptions" actions={<Button size="sm" onClick={() => setShowProvision(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Provision</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground"><DollarSign className="mr-1 inline h-3 w-3" />MRR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totalMrr)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground"><CreditCard className="mr-1 inline h-3 w-3" />Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{activeCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground"><Users className="mr-1 inline h-3 w-3" />Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{subs?.length ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground"><TrendingUp className="mr-1 inline h-3 w-3" />Canceled</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{canceledCount}</p></CardContent></Card>
      </div>
      {subs && subs.length > 0 ? (
        <DataTable columns={columns} data={subs} searchPlaceholder="Search subscriptions..." />
      ) : (
        <EmptyState title="No subscriptions" description="Subscriptions will appear here once customers sign up or you provision one." />
      )}
      {showProvision && <ProvisionModal onClose={() => setShowProvision(false)} />}
    </div>
  );
}