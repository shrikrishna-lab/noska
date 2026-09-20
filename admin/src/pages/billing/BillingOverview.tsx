// Admin → Billing → Overview (§21): real metrics from billing data. No fabricated numbers.
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBillingSubscriptions, useBillingPayments, useBillingWebhooks } from "@/lib/billing-queries";

type Range = "7d" | "30d" | "90d" | "12m";

const RANGES: Array<{ id: Range; label: string; days: number }> = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "12m", label: "12 months", days: 365 },
];

export function BillingOverview() {
  const [range, setRange] = useState<Range>("30d");
  const subs = useBillingSubscriptions();
  const pays = useBillingPayments();
  const hooks = useBillingWebhooks("failed");

  const m = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    const since = Date.now() - days * 86400000;
    const allSubs = subs.data ?? [];
    const allPays = pays.data ?? [];
    const inRange = <T extends { created_at: string }>(rows: T[]) => rows.filter((r) => new Date(r.created_at).getTime() >= since);
    const active = allSubs.filter((s) => s.status === "active");
    const trialing = allSubs.filter((s) => s.status === "trialing");
    const pastDue = allSubs.filter((s) => s.status === "past_due" || s.status === "unpaid");
    const cancelled = allSubs.filter((s) => s.status === "cancelled");
    const newSubs = inRange(allSubs);
    const paidPays = inRange(allPays).filter((p) => p.status === "captured" || p.status === "paid");
    const failedPays = inRange(allPays).filter((p) => p.status === "failed");
    const revenue = paidPays.reduce((a, p) => a + Number(p.amount ?? 0), 0);
    const mrr = active.reduce((a, s) => {
      const amt = Number(s.amount ?? 0);
      return a + (s.billing_cycle === "yearly" ? amt / 12 : amt);
    }, 0);
    const churnBase = active.length + cancelled.length;
    const churn = churnBase > 0 ? Math.round((cancelled.length / churnBase) * 100) : 0;
    // Provider split (Stripe vs Razorpay) — all from live rows.
    const byProvider = (rows: Array<{ payment_method?: string | null }>) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.payment_method ?? "unknown", (m.get(r.payment_method ?? "unknown") ?? 0) + 1);
      return [...m.entries()].map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";
    };
    const revByCurrency = (rows: typeof paidPays) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.currency ?? "", (m.get(r.currency ?? "") ?? 0) + Number(r.amount ?? 0));
      return [...m.entries()].map(([k, v]) => `${k} ${Math.round(v).toLocaleString("en-IN")}`).join(" · ") || "—";
    };
    return { active: active.length, trialing: trialing.length, pastDue: pastDue.length, cancelled: cancelled.length, newSubs: newSubs.length, revenue, mrr, arr: mrr * 12, failed: failedPays.length, webhookFailures: (hooks.data ?? []).length, churn, providers: byProvider(paidPays), revSplit: revByCurrency(paidPays) };
  }, [subs.data, pays.data, hooks.data, range]);

  if (subs.isLoading || pays.isLoading) return <LoadingState />;
  if (!subs.data?.length && !pays.data?.length) {
    return (
      <div>
        <PageHeader title="Billing Overview" description="Revenue and subscription health from live billing data." />
        <EmptyState title="No billing data yet" description="Metrics appear here once subscriptions and payments exist." />
      </div>
    );
  }

  const cards: Array<[string, string]> = [
    ["MRR", `₹${Math.round(m.mrr).toLocaleString("en-IN")}`],
    ["ARR", `₹${Math.round(m.arr).toLocaleString("en-IN")}`],
    ["Active subscribers", String(m.active)],
    ["Trial users", String(m.trialing)],
    ["Past due", String(m.pastDue)],
    ["Cancelled", String(m.cancelled)],
    ["New (range)", String(m.newSubs)],
    ["Revenue (range)", `₹${Math.round(m.revenue).toLocaleString("en-IN")}`],
    ["Revenue by currency (range)", m.revSplit],
    ["Paid by provider (range)", m.providers],
    ["Failed payments (range)", String(m.failed)],
    ["Failed webhooks", String(m.webhookFailures)],
    ["Churn", `${m.churn}%`],
  ];

  return (
    <div>
      <PageHeader title="Billing Overview" description="Revenue and subscription health from live billing data." />
      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`rounded-full px-4 py-1.5 text-sm ${range === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
