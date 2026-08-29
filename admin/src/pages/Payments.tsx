import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayments, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { DollarSign, TrendingUp, AlertCircle, Download } from "lucide-react";
import { downloadCSV } from "@/lib/utils";
import type { DbPayment } from "@/lib/queries";

const statusColors: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  succeeded: "success", refunded: "warning", failed: "destructive", pending: "secondary",
};

export function Payments() {
  const { data: payments, isLoading } = usePayments();
  useRealtimeInvalidate(["admin", "payments"], "payments");

  const totalRevenue = payments?.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const totalRefunded = payments?.filter((p) => p.status === "refunded").reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const failedCount = payments?.filter((p) => p.status === "failed").length ?? 0;
  const successRate = payments && payments.length > 0
    ? ((payments.filter((p) => p.status === "succeeded").length / payments.length) * 100).toFixed(1)
    : "0.0";

  const columns: Column<DbPayment>[] = [
    {
      key: "customer_name", label: "Customer", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {row.customer_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="font-medium">{row.customer_name}</span>
        </div>
      ),
    },
    {
      key: "amount", label: "Amount", sortable: true, className: "text-right",
      render: (row) => <span className="font-medium font-mono">{formatCurrency(row.amount ?? 0)}</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge>,
    },
    { key: "method", label: "Method", sortable: true, render: (row) => row.method || "—", hideOnMobile: true },
    { key: "paid_at", label: "Date", sortable: true, render: (row) => row.paid_at ? <span className="text-muted-foreground">{formatRelativeTime(row.paid_at)}</span> : "—", hideOnMobile: true },
    {
      key: "id", label: "Actions", className: "w-[80px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === "succeeded" && (
            <Button variant="ghost" size="sm" className="text-xs h-7 text-amber-600 hover:text-amber-700">Refund</Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Payments" description="View all payment transactions" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Payments" description="View all payment transactions">
        {payments && payments.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => downloadCSV("payments.csv", payments as any)}>
            <Download className="mr-1 h-3.5 w-3.5" />Export CSV
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Refunded</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <p className="text-2xl font-bold">{formatCurrency(totalRefunded)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Failed</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-2xl font-bold">{failedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Success Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{successRate}%</p></CardContent>
        </Card>
      </div>

      {payments && payments.length > 0 ? (
        <DataTable columns={columns} data={payments} searchPlaceholder="Search payments..." />
      ) : (
        <EmptyState title="No payments" description="Payment transactions will appear here once customers start paying." icon={DollarSign} />
      )}
    </div>
  );
}
