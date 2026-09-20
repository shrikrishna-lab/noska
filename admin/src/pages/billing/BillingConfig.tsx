// Admin → Billing → Configuration (§41): monetization settings without code changes.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingConfig, useAdminSetConfig, useBillingPlans, usePlanPrices, useUpsertPlanPrice, useTaxRates, useCreateTaxRate, useUpdateTaxRate } from "@/lib/billing-queries";
import toast from "react-hot-toast";

const FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: "currency", label: "Currency", hint: "ISO code, e.g. INR" },
  { key: "default_plan", label: "Default plan slug", hint: "Plan for new users" },
  { key: "trial_enabled", label: "Trials enabled", hint: "true / false" },
  { key: "trial_days", label: "Default trial days", hint: "number" },
  { key: "grace_period_days", label: "Grace period days", hint: "number" },
  { key: "enable_yearly_billing", label: "Yearly billing", hint: "true / false" },
  { key: "enable_coupons", label: "Coupons", hint: "true / false" },
  { key: "enable_proration", label: "Proration", hint: "true / false" },
  { key: "enable_downgrades", label: "Downgrades", hint: "true / false" },
  { key: "allow_cancellation", label: "Self-serve cancellation", hint: "true / false" },
  { key: "allow_resume", label: "Resume cancelled", hint: "true / false" },
  { key: "billing_email_enabled", label: "Billing emails", hint: "true / false" },
  { key: "payment_retry_enabled", label: "Payment retry", hint: "true / false" },
];

export function BillingConfig() {
  const cfg = useBillingConfig();
  const setCfg = useAdminSetConfig();
  const [reason, setReason] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (cfg.isLoading) return <LoadingState />;
  const map = new Map((cfg.data ?? []).map((c) => [c.key, c.value]));

  async function save(key: string) {
    const raw = drafts[key];
    if (raw === undefined) { toast.error("No change"); return; }
    let value: unknown = raw;
    try { value = JSON.parse(raw); } catch { value = raw; }
    try {
      await setCfg.mutateAsync({ key, value, reason });
      toast.success(`${key} updated`);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } catch { toast.error("Save failed"); }
  }

  return (
    <div>
      <PageHeader title="Billing Configuration" description="Monetization rules editable without changing source code." />
      <div className="grid max-w-4xl gap-4">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {FIELDS.map((f) => {
              const cur = map.get(f.key);
              const shown = typeof cur === "string" ? cur : JSON.stringify(cur ?? "");
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="w-56"><Label>{f.label}</Label><div className="text-[11px] text-muted-foreground">{f.hint} · key: <span className="font-mono">{f.key}</span></div></div>
                  <Input className="flex-1 font-mono" value={drafts[f.key] ?? shown} onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))} />
                  <Button size="sm" variant="outline" onClick={() => save(f.key)}>Save</Button>
                </div>
              );
            })}
            <div className="space-y-1">
              <Label>Reason (audit log)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this changing?" />
            </div>
          </CardContent>
        </Card>
        <RegionalPricingCard reason={reason} />
        <TaxRatesCard reason={reason} />
      </div>
    </div>
  );
}

function RegionalPricingCard({ reason }: { reason: string }) {
  const plans = useBillingPlans();
  const prices = usePlanPrices();
  const upsert = useUpsertPlanPrice();
  const [planId, setPlanId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("US");
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  async function save() {
    if (!planId || !currency.trim() || !monthly || !yearly) { toast.error("Plan, currency and both prices required"); return; }
    try {
      await upsert.mutateAsync({
        plan_id: planId, currency: currency.trim(), country_code: country.trim() || null,
        monthly_price: Number(monthly), yearly_price: Number(yearly), reason,
      });
      toast.success("Regional price saved — checkout uses it for matching customers");
      setMonthly(""); setYearly("");
    } catch { toast.error("Save failed"); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Regional pricing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Same plans, localized prices. Checkout picks the row matching the customer's billing country,
          else the plan's base currency. AI credit amounts live on each plan (Plans & Features).
        </p>
        {(prices.data ?? []).map((r) => {
          const pname = (plans.data ?? []).find((p) => p.id === r.plan_id)?.name ?? r.plan_id.slice(0, 8);
          return (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span>{pname} · <span className="font-mono">{r.currency}</span>{r.country_code ? ` · ${r.country_code}` : ""}</span>
              <span>{r.monthly_price}/mo · {r.yearly_price}/yr</span>
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select className="rounded-md border px-2 py-2 text-sm" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Plan…</option>
            {(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="USD" />
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="US" />
          <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="Monthly" />
          <Input type="number" value={yearly} onChange={(e) => setYearly(e.target.value)} placeholder="Yearly" />
        </div>
        <Button size="sm" variant="outline" onClick={save}>Save regional price</Button>
      </CardContent>
    </Card>
  );
}

function TaxRatesCard({ reason }: { reason: string }) {
  const rates = useTaxRates();
  const create = useCreateTaxRate();
  const update = useUpdateTaxRate();
  const [country, setCountry] = useState("IN");
  const [name, setName] = useState("GST");
  const [rate, setRate] = useState("0.18");

  async function save() {
    if (!country.trim() || !name.trim()) { toast.error("Country and name required"); return; }
    try {
      await create.mutateAsync({ country: country.trim(), name: name.trim(), rate: Number(rate) || 0, reason });
      toast.success("Tax rate saved");
    } catch { toast.error("Save failed"); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Taxes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Rates are stored separately and applied at checkout. No rate configured means no tax. Rate is a fraction (0.18 = 18%).</p>
        {(rates.data ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm">
            <span>{r.country} · {r.name} · {(Number(r.rate) * 100).toFixed(1)}%</span>
            <Button size="sm" variant="outline" onClick={async () => {
              try { await update.mutateAsync({ id: r.id, patch: { is_active: !r.is_active }, reason }); toast.success("Updated"); }
              catch { toast.error("Update failed"); }
            }}>{r.is_active ? "Disable" : "Enable"}</Button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="IN" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GST" />
          <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.18" />
        </div>
        <Button size="sm" variant="outline" onClick={save}>Save tax rate</Button>
      </CardContent>
    </Card>
  );
}
