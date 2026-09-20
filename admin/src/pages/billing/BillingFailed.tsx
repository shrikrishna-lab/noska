// Admin → Billing → Failed Payments: every failed/past-due signal in one place.
import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBillingPayments, useBillingSubscriptions } from "@/lib/billing-queries";

export function BillingFailed() {
  const pays = useBillingPayments();
  const subs = useBillingSubscriptions();

  const rows = useMemo(() => {
    const failed = (pays.data ?? []).filter((p) => p.status === "failed");
    const pastDue = (subs.data ?? []).filter((s) => s.status === "past_due" || s.status === "unpaid");
    return {
      failed,
      pastDue: pastDue.filter((s) => !failed.some((f) => f.subscription_id === s.id)),
    };
  }, [pays.data, subs.data]);

  if (pays.isLoading || subs.isLoading) return <LoadingState />;
  if (!rows.failed.length && !rows.pastDue.length) {
    return (
      <div>
        <PageHeader title="Failed Payments" description="Failed charges and past-due subscriptions." />
        <EmptyState title="All clear" description="No failed payments or past-due subscriptions." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Failed Payments" description="Failed charges and past-due subscriptions with grace state." />
      <h2 className="mb-2 text-lg font-semibold">Failed charges ({rows.failed.length})</h2>
      <DataTable
        columns={[
          { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 14)}…</span> },
          { key: "amount", label: "Amount", className: "text-right", render: (r) => `₹${Number(r.amount).toLocaleString("en-IN")}` },
          { key: "failure_code", label: "Code", render: (r) => <span className="font-mono text-xs">{r.failure_code ?? "—"}</span> },
          { key: "failure_message", label: "Reason", render: (r) => <span className="max-w-xs truncate text-xs">{r.failure_message ?? "—"}</span> },
          { key: "created_at", label: "Date", sortable: true, render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
        ]}
        data={rows.failed}
        rowKey={(r) => r.id}
        emptyMessage="No failed charges."
      />
      <h2 className="mb-2 mt-8 text-lg font-semibold">Past due ({rows.pastDue.length})</h2>
      <DataTable
        columns={[
          { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 14)}…</span> },
          { key: "status", label: "Status", render: (r) => <Badge variant="warning">{r.status}</Badge> },
          { key: "grace_period_until", label: "Grace until", render: (r) => (r.grace_period_until ? new Date(r.grace_period_until).toLocaleDateString("en-IN") : "—") },
          { key: "current_period_end", label: "Period end", render: (r) => (r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("en-IN") : "—") },
        ]}
        data={rows.pastDue}
        rowKey={(r) => r.id}
        emptyMessage="No past-due subscriptions."
      />
    </div>
  );
}
