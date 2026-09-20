// Admin → Billing → Audit (§50): who changed what, when, why.
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingAudit } from "@/lib/billing-queries";

export function BillingAudit() {
  const audit = useBillingAudit();
  if (audit.isLoading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Billing Audit Log" description="Every admin and billing mutation: actor, target, before/after, reason." />
      <DataTable
        columns={[
          { key: "action", label: "Action", sortable: true, render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: "entity_type", label: "Entity", render: (r) => `${r.entity_type}:${r.entity_id.slice(0, 8)}…` },
          { key: "target_user_id", label: "Target user", render: (r) => <span className="font-mono text-xs">{(r.target_user_id ?? "—").slice(0, 14)}</span> },
          { key: "reason", label: "Reason", render: (r) => <span className="max-w-xs truncate text-xs">{r.reason ?? "—"}</span> },
          { key: "created_at", label: "When", sortable: true, render: (r) => new Date(r.created_at).toLocaleString("en-IN") },
        ]}
        data={audit.data ?? []}
        rowKey={(r) => r.id}
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
