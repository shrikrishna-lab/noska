// Admin → Billing → Overrides (§25): manual entitlement grants with expiry + reason. All audited.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingOverrides, useCreateOverride, useRemoveOverride } from "@/lib/billing-queries";
import toast from "react-hot-toast";

export function BillingOverrides() {
  const overrides = useBillingOverrides();
  const create = useCreateOverride();
  const remove = useRemoveOverride();
  const [form, setForm] = useState({ user_id: "", feature_key: "custom_agents", limit_value: "", days: "30", reason: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onGrant() {
    if (!form.user_id.trim() || !form.feature_key.trim() || !form.reason.trim()) { toast.error("User, feature and reason are required"); return; }
    try {
      await create.mutateAsync({
        user_id: form.user_id.trim(), feature_key: form.feature_key.trim(),
        limit_value: form.limit_value ? Number(form.limit_value) : null,
        expires_at: form.days ? new Date(Date.now() + Number(form.days) * 86400000).toISOString() : null,
        reason: form.reason.trim(),
      });
      toast.success("Override granted");
      setForm({ user_id: "", feature_key: "custom_agents", limit_value: "", days: "30", reason: "" });
    } catch { toast.error("Grant failed"); }
  }

  if (overrides.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Entitlement Overrides" description="Support grants with automatic expiry. Expired overrides stop affecting entitlements." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Grant access</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>User ID (Clerk sub)</Label><Input value={form.user_id} onChange={(e) => set("user_id", e.target.value)} placeholder="user_…" /></div>
            <div className="space-y-1"><Label>Feature key</Label><Input value={form.feature_key} onChange={(e) => set("feature_key", e.target.value)} placeholder="custom_agents" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Limit (optional)</Label><Input type="number" value={form.limit_value} onChange={(e) => set("limit_value", e.target.value)} placeholder="50" /></div>
              <div className="space-y-1"><Label>Expires in (days)</Label><Input type="number" value={form.days} onChange={(e) => set("days", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Reason (required, audited)</Label><Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Beta tester" /></div>
            <Button onClick={onGrant} disabled={create.isPending}>Grant</Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <DataTable
            columns={[
              { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{(r.user_id ?? "").slice(0, 14)}…</span> },
              { key: "feature_key", label: "Feature", render: (r) => <span className="font-mono">{r.feature_key}</span> },
              { key: "limit_value", label: "Limit", render: (r) => (r.limit_value ?? "—") },
              { key: "expires_at", label: "Expires", render: (r) => {
                if (!r.expires_at) return "never";
                const exp = new Date(r.expires_at) < new Date();
                return <Badge variant={exp ? "secondary" : "success"}>{new Date(r.expires_at).toLocaleDateString("en-IN")}{exp ? " (expired)" : ""}</Badge>;
              } },
              { key: "reason", label: "Reason", render: (r) => r.reason ?? "—", hideOnMobile: true },
              { key: "id", label: "", render: (r) => (
                <Button size="sm" variant="outline" onClick={async () => {
                  const reason = window.prompt("Reason for removal (audited):");
                  if (!reason) return;
                  try { await remove.mutateAsync({ id: r.id, target_user_id: r.user_id, reason }); toast.success("Override revoked"); }
                  catch { toast.error("Revoke failed"); }
                }}>Revoke</Button>
              ) },
            ]}
            data={overrides.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No overrides."
          />
        </div>
      </div>
    </div>
  );
}
