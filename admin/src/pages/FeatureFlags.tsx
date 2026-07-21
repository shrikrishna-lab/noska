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
  growth: { label: "Growth", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Zap },
  platform: { label: "Platform", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Layers },
  experimental: { label: "Experimental", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Sparkles },
  ops: { label: "Ops", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", icon: AlertTriangle },
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c]/95 backdrop-blur-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10">
                  <Flag className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{isEditing ? "Edit" : "Create"} Feature Flag</h2>
                  <p className="text-xs text-zinc-500">{isEditing ? "Update flag configuration" : "Add a new feature flag"}</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dark Mode" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Key</Label>
                  <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. dark_mode" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" disabled={isEditing} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-400">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this flag control?" rows={2} className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs font-medium text-zinc-400">Rollout %</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={rolloutPercent} onChange={(e) => setRolloutPercent(e.target.value)} min="0" max="100" className="border-white/10 bg-white/5 text-white h-9" />
                    <Progress value={parseInt(rolloutPercent) || 0} className="h-1.5 w-12 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" />
                  </div>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0" onClick={handleSubmit} disabled={!key.trim() || !name.trim() || submitting}>
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
          <h1 className="text-xl font-bold text-white tracking-tight">Feature Flags</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Toggle and manage feature flags across the platform</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20">
          <Plus className="mr-1.5 h-4 w-4" /> Create Flag
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search feature flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 bg-white/[0.02] gap-0.5">
          {CATEGORIES.map((c) => {
            const cfg = categoryConfig[c];
            const Icon = c === "all" ? Filter : cfg?.icon || Flag;
            return (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors capitalize",
                  categoryFilter === c
                    ? c === "all" ? "bg-white/10 text-zinc-200" : `${cfg?.bg} ${cfg?.color}`
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className={cn("h-3 w-3")} />
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
                    "border group relative overflow-hidden transition-all duration-200",
                    enabled ? `${cfg.border.replace("border", "border")}` : "border-white/[0.06] bg-white/[0.02]"
                  )}>
                    <CardContent className="p-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/[0.02] pointer-events-none" />
                      <div className="flex items-start justify-between gap-3 relative">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn("flex items-center justify-center h-6 w-6 rounded-lg", enabled ? cfg.bg : "bg-zinc-500/10")}>
                              <Icon className={cn("h-3 w-3", enabled ? cfg.color : "text-zinc-400")} />
                            </div>
                            <span className={cn("font-medium text-sm truncate", enabled ? "text-zinc-100" : "text-zinc-300")}>{flag.name}</span>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 border", cfg.border, cfg.color)}>{flag.category}</Badge>
                          </div>
                          {flag.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">{flag.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-2">
                            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{flag.key}</code>
                            {flag.updated_at && <span>Updated {formatRelativeTime(flag.updated_at)}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={flag.rollout_percent} className={cn("h-1 w-16", enabled ? "bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" : "bg-white/5")} />
                            <span className="text-[10px] font-mono text-zinc-500">{flag.rollout_percent}%</span>
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
                            <button onClick={() => setEditingFlag(flag)} className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors" title="Edit">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(flag)} className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
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