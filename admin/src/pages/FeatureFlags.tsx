import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useFeatureFlags, useToggleFeatureFlag, useCreateFeatureFlag, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DbFeatureFlag } from "@/lib/queries";
import { Flag, Plus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const categoryColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  growth: "success", platform: "default", experimental: "warning", ops: "secondary",
};

function CreateFlagModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("platform");
  const [rolloutPercent, setRolloutPercent] = useState("100");
  const createFlag = useCreateFeatureFlag();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!key.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      await createFlag.mutateAsync({
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description,
        category,
        enabled: false,
        rollout_percent: parseInt(rolloutPercent) || 100,
      });
      toast.success(`Flag "${name}" created`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create flag"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Feature Flag</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dark Mode" autoFocus /></div>
          <div className="space-y-2"><Label>Key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. dark_mode" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this flag control?" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="experimental">Experimental</SelectItem>
                  <SelectItem value="ops">Ops</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Rollout %</Label><Input type="number" value={rolloutPercent} onChange={(e) => setRolloutPercent(e.target.value)} min="0" max="100" /></div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!key.trim() || !name.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Flag
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function FeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  useRealtimeInvalidate(["admin", "feature-flags"], "feature_flags");

  const filtered = (flags ?? []).filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-6"><PageHeader title="Feature Flags" description="Toggle and manage feature flags" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Feature Flags"
        description="Toggle and manage feature flags"
        actions={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Create Flag</Button>}
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
      {showForm && <CreateFlagModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
