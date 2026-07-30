import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useFeatureFlags, useToggleFeatureFlag, useCreateFeatureFlag, useUpdateFeatureFlag, useDeleteFeatureFlag, useRealtimeInvalidate } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DbFeatureFlag } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Flag, Plus, X, Loader2, Pencil, Trash2, Search, Filter, Sparkles, Zap, AlertTriangle, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { useIslandNotification } from "@/components/ui/DynamicIslandNotification";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const CATEGORIES = ["all", "growth", "platform", "experimental", "ops"] as const;

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Flag }> = {
  growth: { label: "Growth", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: Zap },
  platform: { label: "Platform", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Layers },
  experimental: { label: "Experimental", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", icon: Sparkles },
  ops: { label: "Ops", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: AlertTriangle },
};

function FlagFormModal({ flag, onClose }: { flag?: DbFeatureFlag; onClose: () => void }) {
  const [key, setKey] = useState(flag?.key ?? "");
  const [name, setName] = useState(flag?.name ?? "");
  const [description, setDescription] = useState(flag?.description ?? "");
  const [category, setCategory] = useState(flag?.category ?? "platform");
  const [rolloutPercent, setRolloutPercent] = useState(String(flag?.rollout_percent ?? "100"));
  const createFlag = useCreateFeatureFlag();
  const updateFlag = useUpdateFeatureFlag();
  const [submitting, setSubmitting] = useState(false);
  const island = useIslandNotification();
  const isEditing = !!flag;

  const handleSubmit = async () => {
    if (!key.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description,
        category,
        rollout_percent: parseInt(rolloutPercent) || 100,
      };
      if (isEditing) {
        await updateFlag.mutateAsync({ id: flag.id, ...data });
        island.success("Flag Updated", `"${name}" has been updated.`);
      } else {
        await createFlag.mutateAsync({ ...data, enabled: false });
        island.success("Flag Created", `"${name}" feature flag created.`);
      }
      onClose();
    } catch (e) {
      island.error("Failed", e instanceof Error ? e.message : "Error occurred");
    }
    setSubmitting(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted border border-border">
                  <Flag className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{isEditing ? "Edit" : "Create"} Feature Flag</h2>
                  <p className="text-xs text-muted-foreground">{isEditing ? "Update flag configuration" : "Add a new feature flag"}</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dark Mode" className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Key</Label>
                  <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. dark_mode" className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9" disabled={isEditing} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this flag control?" rows={2} className="border-border bg-background text-foreground placeholder:text-muted-foreground resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-border bg-background text-foreground h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["growth", "platform", "experimental", "ops"].map((c) => {
                        const cfg = categoryConfig[c];
                        const Icon = cfg.icon;
                        return (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-3 w-3", cfg.color)} />
                              {cfg.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Rollout %</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={rolloutPercent} onChange={(e) => setRolloutPercent(e.target.value)} min="0" max="100" className="border-border bg-background text-foreground h-9" />
                    <Progress value={parseInt(rolloutPercent) || 0} className="h-1.5 w-12 bg-muted" />
                  </div>
                </div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" onClick={handleSubmit} disabled={!key.trim() || !name.trim() || submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditing ? "Save Changes" : "Create Flag"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

export function FeatureFlags() {
  const { confirm } = useConfirmDialog();
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();
  const deleteFlag = useDeleteFeatureFlag();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingFlag, setEditingFlag] = useState<DbFeatureFlag | null>(null);
  const island = useIslandNotification();
  useRealtimeInvalidate(["admin", "feature-flags"], "feature_flags");

  const filtered = (flags ?? []).filter(
    (f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }
  );

  const handleDelete = async (flag: DbFeatureFlag) => {
    if (!await confirm({ title: "Delete Feature Flag", description: `Permanently delete "${flag.name}"? This cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
    try {
      await deleteFlag.mutateAsync(flag.id);
      island.info("Flag Deleted", `"${flag.name}" has been removed.`);
    } catch {
      toast.error("Failed to delete flag");
    }
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Feature Flags" description="Toggle and manage feature flags" /><LoadingState count={6} /></div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Feature Flags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Toggle and manage feature flags across the platform</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          <Plus className="mr-1.5 h-4 w-4" /> Create Flag
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feature flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
          />
        </div>
        <div className="flex rounded-lg border border-border p-0.5 bg-muted/50 gap-0.5">
          {CATEGORIES.map((c) => {
            const cfg = categoryConfig[c];
            const Icon = c === "all" ? Filter : cfg?.icon || Flag;
            return (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize",
                  categoryFilter === c
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", categoryFilter === c && cfg?.color)} />
                <span className="hidden sm:inline">{c === "all" ? "All" : cfg?.label || c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((flag) => {
              const enabled = flag.enabled;
              const cfg = categoryConfig[flag.category] || categoryConfig.platform;
              const Icon = cfg.icon;
              return (
                <motion.div key={flag.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className={cn(
                    "border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden",
                    enabled && cfg.border
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 relative">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn("flex items-center justify-center h-6 w-6 rounded-lg shrink-0", enabled ? cfg.bg : "bg-muted text-muted-foreground")}>
                              <Icon className={cn("h-3.5 w-3.5", enabled ? cfg.color : "text-muted-foreground")} />
                            </div>
                            <span className={cn("font-bold text-sm truncate text-foreground")}>{flag.name}</span>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 border font-semibold", cfg.border, cfg.color)}>{flag.category}</Badge>
                          </div>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{flag.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80 border border-border">{flag.key}</code>
                            {flag.updated_at && <span>Updated {formatRelativeTime(flag.updated_at)}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={flag.rollout_percent} className="h-1.5 w-16 bg-muted" />
                            <span className="text-[10px] font-mono text-muted-foreground font-medium">{flag.rollout_percent}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => {
                              toggleMutation.mutate({ id: flag.id, enabled: checked });
                              if (checked) {
                                island.success("Flag Enabled", `"${flag.name}" is now active.`, { icon: "deploy" });
                              } else {
                                island.info("Flag Disabled", `"${flag.name}" is now disabled.`, { icon: "deploy" });
                              }
                            }}
                          />
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingFlag(flag)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(flag)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState title={search || categoryFilter !== "all" ? "No matching flags" : "No feature flags yet"} description={search || categoryFilter !== "all" ? "Try adjusting your search or filters." : "Feature flags will appear here once created."} />
      )}

      <AnimatePresence>
        {showForm && <FlagFormModal onClose={() => setShowForm(false)} />}
        {editingFlag && <FlagFormModal key="edit" flag={editingFlag} onClose={() => setEditingFlag(null)} />}
      </AnimatePresence>
    </div>
  );
}