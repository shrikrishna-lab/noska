// Admin → Billing → Coupons (§26): builder + server-side preview note.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingCoupons, useCreateCoupon, useUpdateCoupon } from "@/lib/billing-queries";
import toast from "react-hot-toast";

export function BillingCoupons() {
  const coupons = useBillingCoupons();
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const [form, setForm] = useState({ code: "", discount_type: "percentage", discount_value: "50", duration: "once", max_redemptions: "500", valid_until: "", minimum_amount: "0" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onCreate() {
    if (!form.code.trim()) { toast.error("Code required"); return; }
    try {
      await create.mutateAsync({
        code: form.code.trim(), discount_type: form.discount_type, discount_value: Number(form.discount_value),
        duration: form.duration, max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
        valid_until: form.valid_until || null, minimum_amount: Number(form.minimum_amount || 0),
      });
      toast.success(`Coupon ${form.code.toUpperCase()} created`);
      setForm({ code: "", discount_type: "percentage", discount_value: "50", duration: "once", max_redemptions: "500", valid_until: "", minimum_amount: "0" });
    } catch { toast.error("Create failed"); }
  }

  if (coupons.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Coupons" description="Discount codes validated server-side at checkout. Final amounts are never computed in the browser." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>New coupon</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="NOSKA50" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Type</Label><Input value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)} placeholder="percentage|fixed" /></div>
              <div className="space-y-1"><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Duration</Label><Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="once|repeating|forever" /></div>
              <div className="space-y-1"><Label>Max redemptions</Label><Input type="number" value={form.max_redemptions} onChange={(e) => set("max_redemptions", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Valid until</Label><Input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></div>
              <div className="space-y-1"><Label>Min amount (₹)</Label><Input type="number" value={form.minimum_amount} onChange={(e) => set("minimum_amount", e.target.value)} /></div>
            </div>
            <Button onClick={onCreate} disabled={create.isPending}>Create coupon</Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <DataTable
            columns={[
              { key: "code", label: "Code", render: (r) => <span className="font-mono font-semibold">{r.code}</span> },
              { key: "discount_value", label: "Discount", render: (r) => (r.discount_type === "percentage" ? `${r.discount_value}%` : `₹${r.discount_value}`) },
              { key: "redemption_count", label: "Used", render: (r) => `${r.redemption_count ?? 0}${r.max_redemptions ? ` / ${r.max_redemptions}` : ""}` },
              { key: "is_active", label: "Active", render: (r) => <Badge variant={r.is_active ? "success" : "secondary"}>{r.is_active ? "yes" : "no"}</Badge> },
              { key: "id", label: "", render: (r) => (
                <Button size="sm" variant="outline" onClick={async () => {
                  try { await update.mutateAsync({ id: r.id, patch: { is_active: !r.is_active }, reason: "admin toggle" }); toast.success("Updated"); }
                  catch { toast.error("Update failed"); }
                }}>{r.is_active ? "Disable" : "Enable"}</Button>
              ) },
            ]}
            data={coupons.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No coupons yet."
          />
        </div>
      </div>
    </div>
  );
}
