// Admin → Billing → Subscriptions & Transactions: searchable/filterable table + CSV export.
// Every number comes from live billing tables — no mocked metrics.
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingSubscriptions, useBillingPayments, useBillingPlans, useAdminCancelSubscription, downloadCSV, stripeDashboardUrl, type BillingPaymentRow, type BillingSubRow } from "@/lib/billing-queries";
import toast from "react-hot-toast";

const STATUS_FILTERS = ["all", "paid", "failed", "refunded", "pending", "past_due", "cancelled"] as const;

export function BillingSubscriptions() {
  const subs = useBillingSubscriptions();
  const pays = useBillingPayments();
  const plans = useBillingPlans();
  const cancel = useAdminCancelSubscription();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const planName = (id: string | null) => (plans.data ?? []).find((p) => p.id === id)?.name ?? (id ? id.slice(0, 8) : "—");

  const rows = useMemo(() => {
    const list = (pays.data ?? []).map((p) => {
      const s = (subs.data ?? []).find((x) => x.id === p.subscription_id);
      return { ...p, plan_status: s?.status ?? null, billing_cycle: s?.billing_cycle ?? null };
    });
    return list.filter((p) => {
      if (status !== "all") {
        const st = (p.status ?? "").toLowerCase();
        if (status === "paid" && !(st === "paid" || st === "captured")) return false;
        else if (status !== "paid" && st !== status && (p.plan_status ?? "") !== status) return false;
      }
      if (q) {
        const hay = `${p.user_id} ${p.provider_payment_id ?? ""} ${p.provider_order_id ?? ""} ${p.payment_method ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [pays.data, subs.data, q, status]);

  const columns: Column<BillingPaymentRow & { plan_status: string | null; billing_cycle: string | null }>[] = [
    { key: "user_id", label: "User", sortable: true, render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 12)}…</span> },
    { key: "amount", label: "Amount", sortable: true, className: "text-right", render: (r) => `${r.currency ?? ""} ${Number(r.amount).toLocaleString("en-IN")}` },
    { key: "status", label: "Status", sortable: true, render: (r) => <Badge variant={r.status === "captured" || r.status === "paid" ? "success" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge> },
    { key: "payment_method", label: "Provider", render: (r) => <span className="text-xs">{r.payment_method ?? "—"}</span>, hideOnMobile: true },
    { key: "provider_payment_id", label: "Payment ID", render: (r) => {
      const url = stripeDashboardUrl("payments", r.provider_payment_id);
      return url
        ? <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-600 underline">{r.provider_payment_id}</a>
        : <span className="font-mono text-xs">{r.provider_payment_id ?? "—"}</span>;
    }, hideOnMobile: true },
    { key: "provider_order_id", label: "Order ID", render: (r) => <span className="font-mono text-xs">{(r.provider_order_id ?? "").slice(0, 18) || "—"}</span>, hideOnMobile: true },
    { key: "created_at", label: "Date", sortable: true, render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
  ];

  if (subs.isLoading || pays.isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Subscriptions & Transactions" description="Search, filter and export every billing transaction." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search user, payment, order…" value={q} onChange={(e) => setQ(e.target.value)} />
        {STATUS_FILTERS.map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
        ))}
        <Button
          size="sm" variant="outline" className="ml-auto"
          onClick={() => { downloadCSV("billing-transactions.csv", rows as unknown as Array<Record<string, unknown>>); toast.success("Exported"); }}
        >
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyMessage="No transactions match." />

      <h2 className="mb-2 mt-8 text-lg font-semibold">Subscriptions ({(subs.data ?? []).length})</h2>
      <DataTable
        columns={[
          { key: "user_id", label: "User", render: (r: BillingSubRow) => <span className="font-mono text-xs">{r.user_id.slice(0, 12)}…</span> },
          { key: "plan_id", label: "Plan", render: (r: BillingSubRow) => planName(r.plan_id) },
          { key: "status", label: "Status", render: (r: BillingSubRow) => <Badge variant={r.status === "active" ? "success" : r.status === "past_due" || r.status === "unpaid" ? "warning" : "secondary"}>{r.status}</Badge> },
          { key: "provider", label: "Provider", render: (r: BillingSubRow) => <span className="text-xs">{r.provider ?? "—"}</span>, hideOnMobile: true },
          {
            key: "provider_subscription_id", label: "Provider sub", render: (r: BillingSubRow) => {
              const url = r.provider === "stripe" ? stripeDashboardUrl("subscriptions", r.provider_subscription_id) : null;
              const short = (r.provider_subscription_id ?? "").slice(0, 16) || "—";
              return url
                ? <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-600 underline">{short}</a>
                : <span className="font-mono text-xs">{short}</span>;
            }, hideOnMobile: true,
          },
          { key: "billing_cycle", label: "Cycle", render: (r: BillingSubRow) => r.billing_cycle ?? "—" },
          { key: "amount", label: "Amount", className: "text-right", render: (r: BillingSubRow) => `${r.currency ?? ""} ${Number(r.amount ?? 0).toLocaleString("en-IN")}` },
          {
            key: "trial_end", label: "Trial / flags", render: (r: BillingSubRow) => (
              <span className="text-xs">
                {r.status === "trialing" && r.trial_end ? `trial → ${new Date(r.trial_end).toLocaleDateString("en-IN")}` : "—"}
                {r.cancel_at_period_end ? <><br /><span className="text-amber-600">cancels {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("en-IN") : ""}</span></> : null}
                {r.scheduled_plan_id ? <><br /><span className="text-blue-600">→ {planName(r.scheduled_plan_id)} at period end</span></> : null}
              </span>
            ), hideOnMobile: true,
          },
          { key: "current_period_end", label: "Period end", render: (r: BillingSubRow) => (r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("en-IN") : "—") },
        ]}
        data={(subs.data ?? []).slice(0, 100)}
        rowKey={(r) => r.id}
        emptyMessage="No subscriptions."
      />
      <SubscriptionActions onCancel={async (id, reason) => {
        try { await cancel.mutateAsync({ id, reason }); toast.success("Subscription set to cancel at period end"); }
        catch { toast.error("Cancel failed"); }
      }} />
    </div>
  );
}

function SubscriptionActions({ onCancel }: { onCancel: (id: string, reason: string) => Promise<void> }) {
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="mt-4 flex max-w-2xl gap-2">
      <Input placeholder="Subscription ID" value={id} onChange={(e) => setId(e.target.value)} />
      <Input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button
        variant="destructive" disabled={!id || !reason}
        onClick={() => onCancel(id, reason).then(() => { setId(""); setReason(""); })}
      >
        Cancel at period end
      </Button>
    </div>
  );
}
