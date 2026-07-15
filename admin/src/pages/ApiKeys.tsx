import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiKeys, useDeleteApiKey } from "@/lib/queries";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiKey } from "@/lib/types";
import { Plus, RotateCcw, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

export function ApiKeys() {
  const { data: keys, isLoading } = useApiKeys();
  const deleteKey = useDeleteApiKey();
  const [deleting, setDeleting] = useState<string | null>(null);

  const columns: Column<ApiKey>[] = [
    { key: "name", label: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: "prefix", label: "Key", render: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.prefix}_...{row.id.slice(-4)}</code> },
    { key: "scopes", label: "Scopes", render: (row) => (
      <div className="flex gap-1 flex-wrap">{(row.scopes ?? []).map((s: string) => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}</div>
    )},
    { key: "usage_this_month", label: "Usage/Month", sortable: true, className: "text-right", render: (row) => formatNumber(row.usage_this_month ?? 0) },
    { key: "last_used_at", label: "Last Used", sortable: true, render: (row) => row.last_used_at ? <span className="text-muted-foreground">{formatRelativeTime(row.last_used_at)}</span> : <span className="text-muted-foreground">Never</span>, hideOnMobile: true },
    { key: "created_at", label: "Created", sortable: true, render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Revoke API key "${row.name}"?`)) return;
            setDeleting(row.id);
            try { await deleteKey.mutateAsync(row.id); toast.success("API key revoked"); }
            catch { toast.error("Failed to revoke key"); }
            setDeleting(null);
          }} disabled={deleting === row.id}>
            {deleting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="API Keys" description="Manage API keys" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="API Keys" description="Manage API keys for external access" actions={<Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Generate Key</Button>} />
      {keys && keys.length > 0 ? (
        <DataTable columns={columns} data={keys} searchable={false} />
      ) : (
        <EmptyState title="No API keys" description="API keys will appear here once generated." />
      )}
    </div>
  );
}