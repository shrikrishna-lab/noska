// Admin → Billing → Webhooks: monitor Stripe + Razorpay events. Sanitized payloads, no secrets.
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Portal } from "@/components/ui/Portal";
import { useBillingWebhooks } from "@/lib/billing-queries";

export function BillingWebhooks() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const hooks = useBillingWebhooks(filter);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(
    () => (hooks.data ?? []).filter((h) => !provider || h.provider === provider),
    [hooks.data, provider],
  );

  if (hooks.isLoading) return <LoadingState />;
  const sel = rows.find((h) => h.id === selected);
  const sanitized = sel ? JSON.stringify(sanitize(sel.payload), null, 2).slice(0, 4000) : "";

  return (
    <div>
      <PageHeader title="Webhook Monitor" description="Stripe + Razorpay event deliveries. Click a row for the sanitized payload." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, "processed", "failed", "received", "processing"].map((s) => (
          <Button key={s ?? "all"} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s ?? "all"}
          </Button>
        ))}
        <span className="mx-1 self-center text-xs text-muted-foreground">provider:</span>
        {[undefined, "stripe", "razorpay"].map((p) => (
          <Button key={p ?? "all"} size="sm" variant={provider === p ? "default" : "outline"} onClick={() => setProvider(p)}>
            {p ?? "all"}
          </Button>
        ))}
      </div>
      <DataTable
        columns={[
          { key: "provider", label: "Provider", render: (r) => <span className="text-xs">{r.provider}</span> },
          { key: "event_type", label: "Event", render: (r) => <span className="font-mono">{r.event_type}</span> },
          { key: "processing_status", label: "Status", render: (r) => (
            <Badge variant={r.processing_status === "processed" ? "success" : r.processing_status === "failed" ? "destructive" : "warning"}>{r.processing_status}</Badge>
          ) },
          { key: "signature_valid", label: "Signature", render: (r) => (r.signature_valid ? "valid" : "INVALID") },
          { key: "created_at", label: "Received", sortable: true, render: (r) => new Date(r.created_at).toLocaleString("en-IN") },
          { key: "error_message", label: "Error", render: (r) => <span className="max-w-xs truncate text-xs">{r.error_message ?? "—"}</span> },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        emptyMessage="No webhook events."
        onRowClick={(r) => setSelected(r.id)}
      />
      {sel && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
            <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-background p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-mono text-sm font-semibold">{sel.event_type}</h2>
              <p className="text-xs text-muted-foreground">Event ID: {sel.event_id} · {new Date(sel.created_at).toLocaleString("en-IN")}</p>
              <pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">{sanitized}</pre>
              <Button className="mt-4" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function sanitize(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;
  if (Array.isArray(payload)) return payload.map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (/secret|signature|token|key|card|cvv|account/i.test(k)) { out[k] = "[redacted]"; continue; }
    out[k] = sanitize(v);
  }
  return out;
}
