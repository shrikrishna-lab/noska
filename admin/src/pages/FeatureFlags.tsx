import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFeatureFlags, useToggleFeatureFlag } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DbFeatureFlag } from "@/lib/queries";
import { Flag, Plus } from "lucide-react";
import toast from "react-hot-toast";

const categoryColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  growth: "success", platform: "default", experimental: "warning", ops: "secondary",
};

export function FeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();
  const [search, setSearch] = useState("");

  const filtered = (flags ?? []).filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-6"><PageHeader title="Feature Flags" description="Toggle and manage feature flags" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Feature Flags"
        description="Toggle and manage feature flags"
        actions={<Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Create Flag</Button>}
      />

      <div className="mb-4">
        <Input placeholder="Search feature flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm h-9" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((flag) => (
            <Card key={flag.id} className={flag.enabled ? "border-primary/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{flag.name}</span>
                      <Badge variant={categoryColors[flag.category] ?? "secondary"} className="text-[9px] px-1.5">{flag.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{flag.description}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Key: <code className="rounded bg-muted px-1">{flag.key}</code>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={flag.rollout_percent} className="h-1 w-16" />
                      <span className="text-[10px] text-muted-foreground">{flag.rollout_percent}%</span>
                    </div>
                    {flag.updated_at && <p className="mt-1 text-[10px] text-muted-foreground">Updated {formatRelativeTime(flag.updated_at)}</p>}
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => {
                      toggleMutation.mutate({ id: flag.id, enabled: checked });
                      toast.success(`${flag.name} ${checked ? "enabled" : "disabled"}`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No feature flags" description="Feature flags will appear here once created." />
      )}
    </div>
  );
}
