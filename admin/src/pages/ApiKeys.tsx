import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApiKeys, useDeleteApiKey, useCreateApiKey, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiKey } from "@/lib/types";
import { Plus, Trash2, Loader2, Copy, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const ALL_SCOPES = ["read", "write", "admin", "analytics", "monitoring", "billing", "ai"];

export function ApiKeys() {
  const { data: keys, isLoading } = useApiKeys();
  const deleteKey = useDeleteApiKey();
  const createKey = useCreateApiKey();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useRealtimeInvalidate(["admin", "api-keys"], "api_keys");

  const handleGenerate = async () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    if (newScopes.length === 0) { toast.error("Select at least one scope"); return; }
    try {
      const result = await createKey.mutateAsync({ name: newName.trim(), scopes: newScopes });
      setCreatedKey(result.key);
    } catch {
      toast.error("Failed to generate API key");
    }
  };

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setNewName("");
    setNewScopes(["read"]);
    setCreatedKey(null);
    setCopied(false);
  };

  const toggleScope = (scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

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
    <div className="p-6 space-y-6">
      <PageHeader title="API Keys" description="Manage API keys for external access" actions={
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Generate Key
        </Button>
      } />
      {keys && keys.length > 0 ? (
        <DataTable columns={columns} data={keys} searchable={false} />
      ) : (
        <EmptyState
          title="No API keys"
          description="Generate your first API key to get started."
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>{createdKey ? "API Key Generated" : "Generate API Key"}</CardTitle>
                <CardDescription>
                  {createdKey ? "Copy this key now. You won't be able to see it again." : "Create a new API key for external access."}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {createdKey ? (
                <>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <code className="break-all text-xs font-mono">{createdKey}</code>
                  </div>
                  <Button className="w-full" onClick={handleCopy}>
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Key"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleClose}>Done</Button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Name</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Production API Key"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Scopes</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SCOPES.map((s) => (
                        <Badge
                          key={s}
                          variant={newScopes.includes(s) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleScope(s)}
                        >{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                    <Button className="flex-1" onClick={handleGenerate} disabled={createKey.isPending}>
                      {createKey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}