// Admin → Billing → Plans (§22): plan builder + feature/limit matrix. Live DB writes, no code deploys.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingPlans, usePlanFeatures, useFeatureCatalog, useUpdatePlan, useUpsertPlanFeature } from "@/lib/billing-queries";
import { PlanBadge } from "@/components/ui/PlanBadge";
import toast from "react-hot-toast";

const LIMIT_KEYS = ["monthly_ai_credits", "daily_ai_requests", "max_workspaces", "max_pages", "max_storage_mb", "max_file_size_mb", "max_members", "max_databases", "max_widgets", "max_automations", "max_custom_agents", "max_mcp_calls"];

export function BillingPlans() {
  const plans = useBillingPlans();
  const catalog = useFeatureCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const features = usePlanFeatures(selected ?? undefined);
  const updatePlan = useUpdatePlan();
  const upsertFeature = useUpsertPlanFeature();
  const [form, setForm] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");

  const plan = plans.data?.find((p) => p.id === selected) ?? null;
  const featMap = new Map((features.data ?? []).map((f) => [f.feature_key, f]));

  async function savePlan() {
    if (!plan) return;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "description", "monthly_price", "yearly_price", "trial_days", "grace_period_days", "display_order", "badge", "cta_text", "provider_monthly_plan_id", "provider_yearly_plan_id"]) {
      if (form[k] !== undefined && form[k] !== "") {
        patch[k] = ["monthly_price", "yearly_price", "trial_days", "grace_period_days", "display_order"].includes(k) ? Number(form[k]) : form[k];
      }
    }
    if (!Object.keys(patch).length) { toast.error("No changes"); return; }
    try {
      await updatePlan.mutateAsync({ id: plan.id, patch, reason });
      toast.success("Plan updated — live for all users on next entitlement refresh");
      setForm({});
    } catch { toast.error("Update failed"); }
  }

  async function toggleFeature(key: string, enabled: boolean) {
    if (!plan) return;
    try {
      await upsertFeature.mutateAsync({ plan_id: plan.id, feature_key: key, enabled, limit_value: featMap.get(key)?.limit_value ?? null, reason });
      toast.success(`${key} ${enabled ? "enabled" : "disabled"} for ${plan.name}`);
    } catch { toast.error("Update failed"); }
  }

  async function saveLimit(key: string, raw: string) {
    if (!plan) return;
    const v = raw === "" ? null : Number(raw);
    if (v !== null && (!Number.isFinite(v) || v < 0)) { toast.error("Invalid limit"); return; }
    try {
      await upsertFeature.mutateAsync({ plan_id: plan.id, feature_key: key, enabled: true, limit_value: v, reason });
      toast.success(`${key} set to ${v}`);
    } catch { toast.error("Update failed"); }
  }

  if (plans.isLoading) return <LoadingState />;

  const boolKeys = (catalog.data ?? []).map((c) => c.feature_key);

  return (
    <div>
      <PageHeader title="Plans" description="Create and configure subscription plans. Changes take effect without a code deploy." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          {(plans.data ?? []).map((p) => (
            <Card key={p.id} className={selected === p.id ? "border-primary" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <PlanBadge plan={p.slug || p.name} name={p.name} size="sm" />
                    <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">₹{p.monthly_price}/mo · ₹{p.yearly_price}/yr · trial {p.trial_days}d</div>
                </div>
                <Button size="sm" variant={selected === p.id ? "default" : "outline"} onClick={() => { setSelected(p.id); setForm({}); }}>Edit</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!plan ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a plan to edit pricing, features and limits.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <PlanBadge plan={plan.slug || plan.name} name={plan.name} size="md" />
                    <CardTitle className="text-base text-zinc-900">— Settings & Limits</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    ["name", "Name"], ["description", "Description"], ["monthly_price", "Monthly price (₹)"],
                    ["yearly_price", "Yearly price (₹)"], ["trial_days", "Trial days"], ["grace_period_days", "Grace days"],
                    ["display_order", "Display order"], ["badge", "Badge"], ["cta_text", "CTA text"],
                    ["provider_monthly_plan_id", "Provider monthly plan ID"], ["provider_yearly_plan_id", "Provider yearly plan ID"],
                  ].map(([k, label]) => (
                    <div key={k} className="space-y-1">
                      <Label>{label}</Label>
                      <Input value={form[k] ?? ""} placeholder={String((plan as unknown as Record<string, unknown>)[k] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="col-span-2 flex gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant={plan.is_public ? "default" : "outline"} onClick={() => updatePlan.mutateAsync({ id: plan.id, patch: { is_public: !plan.is_public }, reason }).then(() => toast.success("Visibility updated"))}>Public: {plan.is_public ? "yes" : "no"}</Button>
                      <Button size="sm" variant={plan.is_highlighted ? "default" : "outline"} onClick={() => updatePlan.mutateAsync({ id: plan.id, patch: { is_highlighted: !plan.is_highlighted }, reason }).then(() => toast.success("Highlight updated"))}>Highlighted: {plan.is_highlighted ? "yes" : "no"}</Button>
                      <Button size="sm" variant="outline" onClick={() => updatePlan.mutateAsync({ id: plan.id, patch: { status: plan.status === "active" ? "archived" : "active" }, reason }).then(() => toast.success("Status updated"))}>
                        {plan.status === "active" ? "Archive" : "Activate"}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Reason (audit log)</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this changing?" />
                  </div>
                  <div className="col-span-2"><Button onClick={savePlan} disabled={updatePlan.isPending}>Save plan</Button></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Features</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {boolKeys.map((k) => {
                    const on = featMap.get(k)?.enabled ?? false;
                    return (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="font-mono">{k}</span>
                        <Button size="sm" variant={on ? "default" : "outline"} onClick={() => toggleFeature(k, !on)}>{on ? "On" : "Off"}</Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Limits</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {LIMIT_KEYS.map((k) => (
                    <LimitRow key={k} k={k} value={featMap.get(k)?.limit_value} onSave={(v) => saveLimit(k, v)} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LimitRow({ k, value, onSave }: { k: string; value?: number | null; onSave: (v: string) => void }) {
  const [v, setV] = useState<string>(value !== null && value !== undefined ? String(value) : "");
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-1 font-mono">{k}</span>
      <Input className="w-32" value={v} onChange={(e) => setV(e.target.value)} placeholder={value === null || value === undefined ? "unset" : String(value)} />
      <Button size="sm" variant="outline" onClick={() => onSave(v)}>Save</Button>
    </div>
  );
}
