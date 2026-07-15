import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "@/lib/queries";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DbPayment } from "@/lib/queries";

const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  succeeded: "success", refunded: "warning", failed: "destructive", pending: "secondary",
};

const columns: Column<DbPayment>[] = [
  { key: "customer_name", label: "Customer", sortable: true, render: (row) => <span className="font-medium">{row.customer_name}</span> },
  { key: "amount", label: "Amount", sortable: true, render: (row) => <span className="font-medium">{formatCurrency(row.amount ?? 0)}</span>, className: "text-right" },
  { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
  { key: "method", label: "Method", sortable: true, render: (row) => row.method || "—", hideOnMobile: true },
  { key: "paid_at", label: "Date", sortable: true, render: (row) => row.paid_at ? <span className="text-muted-foreground">{formatRelativeTime(row.paid_at)}</span> : "—", hideOnMobile: true },
];

export function Payments() {
  const { data: payments, isLoading } = usePayments();

  if (isLoading) return <div className="p-6"><PageHeader title="Payments" description="View all payment transactions" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Payments" description="View all payment transactions" />
      {payments && payments.length > 0 ? (
        <DataTable columns={columns} data={payments} searchPlaceholder="Search payments..." />
      ) : (
        <EmptyState title="No payments" description="Payment transactions will appear here once customers start paying." />
      )}
    </div>
  );
}
