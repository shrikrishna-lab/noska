// Admin → Billing → Features (§28): central feature registry. No code deploy needed
// to change availability — assign features to plans from Plans & Features.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFeatureCatalog, useCreateFeature, useUpdateFeature } from "@/lib/billing-queries";
import toast from "react-hot-toast";

export function BillingFeatures() {
  const catalog = useFeatureCatalog();
  const create = useCreateFeature();
  const update = useUpdateFeature();
  const [form, setForm] = useState({ feature_key: "", display_name: "", description: "", category: "general" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onCreate() {
    if (!form.feature_key.trim() || !form.display_name.trim()) { toast.error("Key and name required"); return; }
    try {
      await create.mutateAsync({ ...form, feature_key: form.feature_key.trim().toLowerCase().replace(/\s+/g, "_") });
      toast.success("Feature registered — assign it to plans from Plans & Features");
      setForm({ feature_key: "", display_name: "", description: "", category: "general" });
    } catch { toast.error("Create failed"); }
  }

  if (catalog.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Feature Catalog" description="Central registry. Rename, recategorize, mark beta/deprecated without deploying code." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>New feature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Key</Label><Input value={form.feature_key} onChange={(e) => set("feature_key", e.target.value)} placeholder="smart_links" /></div>
            <div className="space-y-1"><Label>Display name</Label><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="Smart Links" /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="ai" /></div>
            <Button onClick={onCreate} disabled={create.isPending}>Register</Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <DataTable
            columns={[
              { key: "feature_key", label: "Key", render: (r) => <span className="font-mono">{r.feature_key}</span> },
              { key: "display_name", label: "Name", render: (r) => r.display_name },
              { key: "category", label: "Category", render: (r) => <Badge variant="secondary">{r.category ?? "general"}</Badge> },
              { key: "is_beta", label: "Beta", render: (r) => (
                <Button size="sm" variant={r.is_beta ? "default" : "outline"} onClick={async () => {
                  try { await update.mutateAsync({ id: r.id, patch: { is_beta: !r.is_beta }, reason: "admin toggle" }); toast.success("Updated"); }
                  catch { toast.error("Update failed"); }
                }}>{r.is_beta ? "beta" : "stable"}</Button>
              ) },
              { key: "is_deprecated", label: "Deprecated", render: (r) => (
                <Button size="sm" variant={r.is_deprecated ? "destructive" : "outline"} onClick={async () => {
                  try { await update.mutateAsync({ id: r.id, patch: { is_deprecated: !r.is_deprecated }, reason: "admin toggle" }); toast.success("Updated"); }
                  catch { toast.error("Update failed"); }
                }}>{r.is_deprecated ? "yes" : "no"}</Button>
              ) },
            ]}
            data={catalog.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No features."
          />
        </div>
      </div>
    </div>
  );
}
