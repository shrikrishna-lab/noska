// Admin → Billing → AI Top-ups (§11): credit pack products + purchases. Fully configurable.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTopupProducts, useTopupPurchases, useCreateTopupProduct, useUpdateTopupProduct } from "@/lib/billing-queries";
import toast from "react-hot-toast";

export function BillingTopups() {
  const products = useTopupProducts();
  const purchases = useTopupPurchases();
  const create = useCreateTopupProduct();
  const update = useUpdateTopupProduct();
  const [form, setForm] = useState({ name: "", slug: "", credits: "500", price: "99", currency: "INR", expiry_days: "30" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onCreate() {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Name and slug required"); return; }
    try {
      await create.mutateAsync({
        name: form.name.trim(), slug: form.slug.trim().toLowerCase(),
        credits: Number(form.credits), price: Number(form.price),
        currency: form.currency.toUpperCase(), expiry_days: Number(form.expiry_days),
      });
      toast.success("Top-up product created — live on the billing page");
      setForm({ name: "", slug: "", credits: "500", price: "99", currency: "INR", expiry_days: "30" });
    } catch { toast.error("Create failed"); }
  }

  if (products.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="AI Credit Top-ups" description="Credit packs users can buy. Prices, credits and expiry are admin-configurable." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>New pack</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Starter Pack" /></div>
            <div className="space-y-1"><Label>Slug</Label><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ai-credits-500" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Credits</Label><Input type="number" value={form.credits} onChange={(e) => set("credits", e.target.value)} /></div>
              <div className="space-y-1"><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Currency</Label><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} /></div>
              <div className="space-y-1"><Label>Expiry (days)</Label><Input type="number" value={form.expiry_days} onChange={(e) => set("expiry_days", e.target.value)} /></div>
            </div>
            <Button onClick={onCreate} disabled={create.isPending}>Create pack</Button>
          </CardContent>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <DataTable
            columns={[
              { key: "name", label: "Pack", render: (r) => r.name },
              { key: "credits", label: "Credits", render: (r) => Number(r.credits).toLocaleString("en-IN") },
              { key: "price", label: "Price", render: (r) => `${r.currency} ${r.price}` },
              { key: "is_active", label: "Active", render: (r) => <Badge variant={r.is_active ? "success" : "secondary"}>{r.is_active ? "yes" : "no"}</Badge> },
              { key: "id", label: "", render: (r) => (
                <Button size="sm" variant="outline" onClick={async () => {
                  try { await update.mutateAsync({ id: r.id, patch: { is_active: !r.is_active }, reason: "admin toggle" }); toast.success("Updated"); }
                  catch { toast.error("Update failed"); }
                }}>{r.is_active ? "Disable" : "Enable"}</Button>
              ) },
            ]}
            data={products.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No packs."
          />
          <h2 className="text-lg font-semibold">Purchases ({(purchases.data ?? []).length})</h2>
          <DataTable
            columns={[
              { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 14)}…</span> },
              { key: "credits_granted", label: "Granted", render: (r) => `${r.credits_used ?? 0} / ${r.credits_granted ?? 0} used` },
              { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "granted" ? "success" : "secondary"}>{r.status}</Badge> },
              { key: "expires_at", label: "Expires", render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN") : "—") },
            ]}
            data={(purchases.data ?? []).slice(0, 100)}
            rowKey={(r) => r.id}
            emptyMessage="No purchases."
          />
        </div>
      </div>
    </div>
  );
}
