// Admin → Billing → Customers & Invoices: billing profiles, GSTIN, invoice history.
// All rows are live database records; invoice links open Stripe-hosted documents.
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBillingCustomers, useBillingInvoices, stripeDashboardUrl, type BillingInvoiceRow, type BillingCustomerRow } from "@/lib/billing-queries";

export function BillingCustomers() {
  const customers = useBillingCustomers();
  const invoices = useBillingInvoices();
  const [q, setQ] = useState("");

  if (customers.isLoading) return <LoadingState />;
  const rows = (customers.data ?? []).filter((c) =>
    !q || `${c.user_id} ${c.email ?? ""} ${c.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Customers & Invoices" description="Billing profiles with country, GSTIN and invoice history." />
      <div className="mb-4">
        <Input className="max-w-xs" placeholder="Search customer…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable
        columns={[
          { key: "user_id", label: "User", render: (r: BillingCustomerRow) => <span className="font-mono text-xs">{r.user_id.slice(0, 14)}…</span> },
          { key: "email", label: "Email", render: (r: BillingCustomerRow) => r.email ?? "—" },
          {
            key: "provider_customer_id", label: "Stripe customer", render: (r: BillingCustomerRow) => {
              const url = stripeDashboardUrl("customers", r.provider_customer_id);
              return url
                ? <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-600 underline">{r.provider_customer_id}</a>
                : <span className="font-mono text-xs">{r.provider_customer_id ?? "—"}</span>;
            }, hideOnMobile: true,
          },
          { key: "billing_country", label: "Country", render: (r: BillingCustomerRow) => r.billing_country ?? "—" },
          { key: "gstin", label: "GSTIN", render: (r: BillingCustomerRow) => <span className="font-mono text-xs">{r.gstin ?? "—"}</span>, hideOnMobile: true },
          { key: "created_at", label: "Since", sortable: true, render: (r: BillingCustomerRow) => new Date(r.created_at).toLocaleDateString("en-IN") },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        emptyMessage="No customers yet."
      />
      <h2 className="mb-2 mt-8 text-lg font-semibold">Invoices ({(invoices.data ?? []).length})</h2>
      <DataTable
        columns={[
          { key: "invoice_number", label: "Number", render: (r: BillingInvoiceRow) => <span className="font-mono">{r.invoice_number ?? "—"}</span> },
          { key: "status", label: "Status", render: (r: BillingInvoiceRow) => r.status ?? "—" },
          { key: "total", label: "Total", className: "text-right", render: (r: BillingInvoiceRow) => `${r.currency ?? ""} ${Number(r.total).toLocaleString("en-IN")}` },
          {
            key: "invoice_url", label: "Documents", render: (r: BillingInvoiceRow) => (
              <span className="space-x-2 text-xs">
                {r.invoice_url ? <a href={r.invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a> : <span className="text-muted-foreground">—</span>}
                {r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">PDF</a> : null}
              </span>
            ),
          },
          { key: "issued_at", label: "Issued", render: (r: BillingInvoiceRow) => (r.issued_at ? new Date(r.issued_at).toLocaleDateString("en-IN") : "—") },
        ]}
        data={(invoices.data ?? []).slice(0, 100)}
        rowKey={(r) => r.id}
        emptyMessage="No invoices."
      />
    </div>
  );
}
