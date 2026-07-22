import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, Pencil, Trash2, Search, Filter,
  LayoutGrid, List, CalendarDays, Clock, ArrowUp, AlertTriangle,
  Circle, User, GitBranch, MessageSquare, CheckSquare, Paperclip,
  Sparkles, Flag, BarChart3, Eye, EyeOff, MoreHorizontal,
  ChevronDown, ChevronRight, Zap, Target, Layers, Box, Rocket,
  Calendar, ArrowRight, Link2, ThumbsUp, ExternalLink,
  Mail, CreditCard, Smartphone, Code, Shield, Database, Cloud,
  Globe, WifiOff, Package,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { useIslandNotification } from "@/components/ui/DynamicIslandNotification";
import { Portal } from "@/components/ui/Portal";
import {
  STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_DOT,
  PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS,
  type RoadmapFeature, type RoadmapSprint, type RoadmapRelease,
  type RoadmapStats, type RoadmapSelectResult,
} from "@/lib/roadmap/types";
import {
  useRoadmapFeatures, useRoadmapStats, useRoadmapSprints, useRoadmapReleases,
  useCreateRoadmapFeature, useUpdateRoadmapFeature, useDeleteRoadmapFeature,
  useUpdateRoadmapStatus, useRoadmapLabels, useCreateSprint, useCloseSprint,
  useCreateRelease, usePublishRelease, useRoadmapComments, useAddRoadmapComment,
  useRoadmapChecklists, useToggleChecklist, useAddChecklistItem,
  useRoadmapActivity, useRoadmapDependencies, useAddDependency,
} from "@/lib/roadmap/hooks";
import { useRoadmapVoteCounts } from "@/lib/queries";

const PRIORITY_ICONS: Record<string, typeof ArrowUp> = {
  critical: AlertTriangle, high: ArrowUp, medium: ArrowUp, low: ArrowUp, nice_to_have: Circle,
};
const PRIORITY_CLASS: Record<string, string> = {
  critical: "text-white", high: "text-white/80", medium: "text-white/60",
  low: "text-white/40", nice_to_have: "text-white/30",
};

function parseLabels(labels: unknown): string[] {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === "string") { try { return JSON.parse(labels); } catch { return []; } }
  return [];
}

function getItemIcon(title: string, category: string | null) {
  const t = (title + " " + (category || "")).toLowerCase();
  if (t.includes("email") || t.includes("mail") || t.includes("notification")) return <Mail className="h-4 w-4" />;
  if (t.includes("pay") || t.includes("billing") || t.includes("subscription")) return <CreditCard className="h-4 w-4" />;
  if (t.includes("vote") || t.includes("poll") || t.includes("feedback")) return <ThumbsUp className="h-4 w-4" />;
  if (t.includes("analytics") || t.includes("stat") || t.includes("chart")) return <BarChart3 className="h-4 w-4" />;
  if (t.includes("mobile") || t.includes("app") || t.includes("phone")) return <Smartphone className="h-4 w-4" />;
  if (t.includes("api") || t.includes("webhook") || t.includes("sdk")) return <Code className="h-4 w-4" />;
  if (t.includes("search") || t.includes("ai") || t.includes("intelligence")) return <Zap className="h-4 w-4" />;
  if (t.includes("auth") || t.includes("security") || t.includes("sso")) return <Shield className="h-4 w-4" />;
  if (t.includes("database") || t.includes("storage") || t.includes("data")) return <Database className="h-4 w-4" />;
  if (t.includes("cloud") || t.includes("deploy") || t.includes("host")) return <Cloud className="h-4 w-4" />;
  if (t.includes("integration") || t.includes("github") || t.includes("git")) return <GitBranch className="h-4 w-4" />;
  if (t.includes("cms") || t.includes("content") || t.includes("layout")) return <LayoutGrid className="h-4 w-4" />;
  if (t.includes("language") || t.includes("translat") || t.includes("i18n")) return <Globe className="h-4 w-4" />;
  if (t.includes("offline") || t.includes("sync") || t.includes("cache")) return <WifiOff className="h-4 w-4" />;
  if (t.includes("template") || t.includes("marketplace")) return <Package className="h-4 w-4" />;
  return <Layers className="h-4 w-4" />;
}

function StatsCards({ stats }: { stats: RoadmapStats | null | undefined }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Features", value: stats.total, icon: Box },
    { label: "In Progress", value: stats.in_progress, icon: Zap },
    { label: "Planned", value: stats.planned, icon: Target },
    { label: "Released", value: stats.released, icon: Sparkles },
    { label: "Blocked", value: stats.blocked, icon: AlertTriangle },
    { label: "Overdue", value: stats.overdue, icon: Clock },
    { label: "Backlog", value: stats.backlog, icon: Layers },
    { label: "Completions", value: `${stats.completion_pct}%`, icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-white/10 bg-black/40 hover:border-white/20 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{c.label}</p>
                  <p className="text-lg font-bold text-white">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SprintReleaseBar({ stats, sprints, releases }: { stats: RoadmapStats | null | undefined; sprints: RoadmapSprint[]; releases: RoadmapRelease[] }) {
  const activeSprint = sprints.find((s) => s.status === "active") || sprints[0];
  const upcomingRelease = releases.find((r) => r.status === "planned" || r.status === "in_progress");

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-white/50">
      {activeSprint && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
          <Zap className="h-3.5 w-3.5 text-white/70" />
          <span className="text-white font-medium">Sprint:</span>
          <span className="text-white/70">{activeSprint.name}</span>
          {activeSprint.end_date && (
            <span className="text-white/40">
              (ends {new Date(activeSprint.end_date).toLocaleDateString()})
            </span>
          )}
        </div>
      )}
      {upcomingRelease && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
          <Rocket className="h-3.5 w-3.5 text-white/70" />
          <span className="text-white font-medium">Release:</span>
          <span className="text-white/70">{upcomingRelease.name} ({upcomingRelease.version})</span>
        </div>
      )}
      {stats && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
          <BarChart3 className="h-3.5 w-3.5 text-white/70" />
          <span className="text-white font-medium">{stats.completion_pct}%</span>
          <span className="text-white/50">complete</span>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  feature, onSelect, onEdit, onDelete, voteCounts,
}: {
  feature: RoadmapFeature; onSelect: (f: RoadmapFeature) => void; onEdit: (f: RoadmapFeature) => void; onDelete: (f: RoadmapFeature) => void; voteCounts: Record<string, number>;
}) {
  const labels = parseLabels(feature.labels);
  const voteCount = voteCounts[feature.id] || 0;
  const IconEl = getItemIcon(feature.title, feature.category);
  const PrioIcon = PRIORITY_ICONS[feature.priority] ?? ArrowUp;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="group border-white/[0.06] bg-black/30 hover:border-white/[0.15] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer"
        onClick={() => onSelect(feature)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 text-white/60">
              {IconEl}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-white truncate">{feature.title}</h3>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(feature); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(feature); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-white/80">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[feature.status] || "bg-white/40")} />
                  {STATUS_LABELS[feature.status] || feature.status}
                </span>
                <span className={cn("flex items-center gap-0.5 text-[10px]", PRIORITY_CLASS[feature.priority] || "text-white/40")}>
                  <PrioIcon className="h-3 w-3" />
                  {PRIORITY_LABELS[feature.priority] || feature.priority}
                </span>
                {voteCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-white/50">
                    <ThumbsUp className="h-3 w-3" />{voteCount}
                  </span>
                )}
              </div>
              {feature.description && (
                <p className="text-[11px] text-white/50 mt-2 line-clamp-2 leading-relaxed">{feature.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {feature.owner && (
                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                    <User className="h-3 w-3" />{feature.owner}
                  </span>
                )}
                {feature.eta && (
                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="h-3 w-3" />{feature.eta}
                  </span>
                )}
                {feature.category && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">{feature.category}</span>
                )}
              </div>
              {labels.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {labels.slice(0, 4).map((l) => (
                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">{l}</span>
                  ))}
                  {labels.length > 4 && <span className="text-[9px] text-white/30">+{labels.length - 4}</span>}
                </div>
              )}
              {feature.progress > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={feature.progress} className="h-1 flex-1 bg-white/10 [&>div]:bg-white" />
                  <span className="text-[9px] font-mono text-white/50">{feature.progress}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureDetailPanel({
  feature, onClose, onRefresh, voteCounts,
}: {
  feature: RoadmapFeature; onClose: () => void; onRefresh: () => void; voteCounts: Record<string, number>;
}) {
  const island = useIslandNotification();
  const { confirm } = useConfirmDialog();
  const updateMutation = useUpdateRoadmapFeature();
  const deleteMutation = useDeleteRoadmapFeature();
  const { data: comments } = useRoadmapComments(feature.id);
  const { data: checklists } = useRoadmapChecklists(feature.id);
  const { data: activity } = useRoadmapActivity(feature.id);
  const { data: deps } = useRoadmapDependencies(feature.id);
  const { data: allFeatures } = useRoadmapFeatures();
  const toggleChecklist = useToggleChecklist();
  const addChecklist = useAddChecklistItem();
  const addComment = useAddRoadmapComment();
  const addDep = useAddDependency();

  const [commentText, setCommentText] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: feature.title,
    description: feature.description || "",
    priority: feature.priority,
    owner: feature.owner || "",
    eta: feature.eta || "",
    progress: feature.progress,
  });
  const [activeTab, setActiveTab] = useState("details");

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: feature.id, ...editForm });
      island.success("Updated", "Feature updated successfully.");
      setEditing(false);
      onRefresh();
    } catch { island.error("Failed", "Could not update feature."); }
  };

  const handleDelete = async () => {
    if (!await confirm({
      title: "Delete Feature", description: `Permanently delete "${feature.title}"? This cannot be undone.`,
      variant: "delete", confirmText: "Delete Feature",
    })) return;
    try {
      await deleteMutation.mutateAsync(feature.id);
      island.success("Deleted", `"${feature.title}" has been deleted.`);
      onClose();
      onRefresh();
    } catch { island.error("Failed", "Could not delete feature."); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({ feature_id: feature.id, content: commentText.trim() });
      setCommentText("");
      island.success("Comment added", "");
    } catch { island.error("Failed", "Could not add comment."); }
  };

  const handleAddChecklist = async () => {
    if (!checklistTitle.trim()) return;
    try {
      await addChecklist.mutateAsync({ feature_id: feature.id, title: checklistTitle.trim() });
      setChecklistTitle("");
    } catch { island.error("Failed", "Could not add checklist item."); }
  };

  return (
    <AnimatePresence>
      <Portal>
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 h-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[feature.status] || "bg-zinc-400")} />
                <span className="text-sm font-semibold text-zinc-100">{feature.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="h-8 text-xs text-zinc-400 hover:text-zinc-200">
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                </Button>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                {editing ? (
                  <div className="space-y-4">
                    <Section label="Title"><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></Section>
                    <Section label="Description"><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="border-white/10 bg-white/5 text-white resize-none" /></Section>
                    <Section label="Priority">
                      <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                        <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Section>
                    <Section label="Owner"><Input value={editForm.owner} onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></Section>
                    <Section label="ETA"><Input value={editForm.eta} onChange={(e) => setEditForm({ ...editForm, eta: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></Section>
                    <Section label="Progress %"><Input type="number" min={0} max={100} value={editForm.progress} onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })} className="border-white/10 bg-white/5 text-white h-9" /></Section>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="border-white/10 text-zinc-300 hover:bg-white/5 flex-1">Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || !editForm.title.trim()} className="bg-gradient-to-r from-zinc-500 to-zinc-700 hover:from-blue-600 hover:to-purple-700 text-white border-0 flex-1">
                        {updateMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                        <span className={cn("text-xs", STATUS_COLORS[feature.status]?.split(" ")[0] || "text-zinc-400")}>{STATUS_LABELS[feature.status] || feature.status}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Priority</p>
                        <span className={cn("text-xs", PRIORITY_CLASS[feature.priority] || "text-zinc-400")}>{PRIORITY_LABELS[feature.priority] || feature.priority}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Owner</p>
                        <span className="text-xs text-zinc-300">{feature.owner || "—"}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">ETA</p>
                        <span className="text-xs text-zinc-300">{feature.eta || "—"}</span>
                      </div>
                      {feature.category && (
                        <div>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Category</p>
                          <span className="text-xs text-zinc-300">{feature.category}</span>
                        </div>
                      )}
                      {feature.progress > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Progress</p>
                          <div className="flex items-center gap-2">
                            <Progress value={feature.progress} className="h-1.5 flex-1 bg-white/5 [&>div]:bg-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-400">{feature.progress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {feature.description && (
                      <Section label="Description">
                        <p className="text-sm text-zinc-300 leading-relaxed">{feature.description}</p>
                      </Section>
                    )}
                    {feature.acceptance_criteria && (
                      <Section label="Acceptance Criteria">
                        <p className="text-sm text-zinc-300 leading-relaxed">{feature.acceptance_criteria}</p>
                      </Section>
                    )}
                    {parseLabels(feature.labels).length > 0 && (
                      <Section label="Labels">
                        <div className="flex gap-1.5 flex-wrap">
                          {parseLabels(feature.labels).map((l) => (
                            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">{l}</span>
                          ))}
                        </div>
                      </Section>
                    )}
                    {feature.sprint_id && (
                      <Section label="Sprint ID">
                        <span className="text-xs text-zinc-400">{feature.sprint_id}</span>
                      </Section>
                    )}
                    {feature.release_id && (
                      <Section label="Release ID">
                        <span className="text-xs text-zinc-400">{feature.release_id}</span>
                      </Section>
                    )}
                    {(feature.target_version || feature.estimated_time) && (
                      <Section label="Planning">
                        <div className="grid grid-cols-2 gap-2">
                          {feature.target_version && <div><p className="text-[10px] text-zinc-500">Target Version</p><p className="text-xs text-zinc-300">{feature.target_version}</p></div>}
                          {feature.estimated_time && <div><p className="text-[10px] text-zinc-500">Estimated Time</p><p className="text-xs text-zinc-300">{feature.estimated_time}</p></div>}
                        </div>
                      </Section>
                    )}
                    {voteCounts[feature.id] > 0 && (
                      <Section label="Votes">
                        <span className="flex items-center gap-1 text-sm text-amber-400/70"><ThumbsUp className="h-4 w-4" />{voteCounts[feature.id]}</span>
                      </Section>
                    )}
                  </>
                )}
                {!editing && (
                  <>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="!mt-8">
                      <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="details" className="text-xs data-[state=active]:bg-zinc-500/20">Details</TabsTrigger>
                        <TabsTrigger value="checklist" className="text-xs data-[state=active]:bg-zinc-500/20">Checklist ({(checklists ?? []).length})</TabsTrigger>
                        <TabsTrigger value="comments" className="text-xs data-[state=active]:bg-zinc-500/20">Comments ({(comments ?? []).length})</TabsTrigger>
                        <TabsTrigger value="dependencies" className="text-xs data-[state=active]:bg-zinc-500/20">Dependencies</TabsTrigger>
                        <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-zinc-500/20">Activity</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {activeTab === "checklist" && (
                      <div className="space-y-1.5">
                        {checklists?.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 py-1">
                            <button onClick={() => toggleChecklist.mutate(item.id)} className={cn("h-4 w-4 rounded border transition-colors flex items-center justify-center shrink-0", item.done ? "bg-zinc-500 border-zinc-500" : "border-white/20 hover:border-white/40")}>
                              {item.done && <CheckSquare className="h-3 w-3 text-white" />}
                            </button>
                            <span className={cn("text-xs", item.done ? "text-zinc-500 line-through" : "text-zinc-300")}>{item.title}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Input value={checklistTitle} onChange={(e) => setChecklistTitle(e.target.value)} placeholder="Add checklist item..." className="border-white/10 bg-white/5 text-white h-8 text-xs placeholder:text-zinc-600"
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklist(); }}
                          />
                          <Button size="sm" onClick={handleAddChecklist} disabled={!checklistTitle.trim()} className="h-8 text-xs bg-zinc-600 hover:bg-zinc-700 text-white border-0"><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    )}
                    {activeTab === "comments" && (
                      <div className="space-y-3">
                        {comments?.map((c) => (
                          <div key={c.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                            <p className="text-xs text-zinc-300">{c.content}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="border-white/10 bg-white/5 text-white h-8 text-xs placeholder:text-zinc-600"
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                          />
                          <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()} className="h-8 text-xs bg-zinc-600 hover:bg-zinc-700 text-white border-0"><MessageSquare className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    )}
                    {activeTab === "dependencies" && (
                      <div className="space-y-2">
                        {deps?.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-xs text-zinc-300 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                            <Link2 className="h-3 w-3 text-zinc-500" />
                            <span>{d.depends_on_id}</span>
                            <Badge variant="outline" className="text-[9px] border-white/10">{d.dep_type}</Badge>
                          </div>
                        ))}
                        <p className="text-[10px] text-zinc-500">Add dependency:</p>
                        <div className="flex gap-2">
                          <Select onValueChange={(v) => addDep.mutate({ feature_id: feature.id, depends_on_id: v, dep_type: "blocks" })}>
                            <SelectTrigger className="border-white/10 bg-white/5 text-white h-8 text-xs flex-1"><SelectValue placeholder="Select feature..." /></SelectTrigger>
                            <SelectContent>
                              {(allFeatures?.data ?? []).filter((f: RoadmapFeature) => f.id !== feature.id).map((f: RoadmapFeature) => (
                                <SelectItem key={f.id} value={f.id} className="text-xs">{f.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {activeTab === "activity" && (
                      <div className="space-y-2">
                        {activity?.map((a) => (
                          <div key={a.id} className="flex items-start gap-2 text-xs text-zinc-400 py-1.5">
                            <span className="text-zinc-500 shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                            <span>{a.action}</span>
                          </div>
                        ))}
                        {(!activity || activity.length === 0) && <p className="text-xs text-zinc-500">No activity yet.</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      </Portal>
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function FeatureFormModal({ feature, onClose, onRefresh }: { feature?: RoadmapFeature | null; onClose: () => void; onRefresh: () => void }) {
  const island = useIslandNotification();
  const create = useCreateRoadmapFeature();
  const update = useUpdateRoadmapFeature();
  const { data: sprints } = useRoadmapSprints();
  const { data: releases } = useRoadmapReleases();
  const { data: labels } = useRoadmapLabels();
  const isEditing = !!feature;

  const [form, setForm] = useState({
    title: feature?.title ?? "",
    description: feature?.description ?? "",
    status: feature?.status ?? "idea",
    priority: feature?.priority ?? "medium",
    owner: feature?.owner ?? "",
    eta: feature?.eta ?? "",
    progress: feature?.progress ?? 0,
    category: feature?.category ?? "",
    epic: feature?.epic ?? "",
    sprint_id: feature?.sprint_id ?? "",
    release_id: feature?.release_id ?? "",
    estimated_time: feature?.estimated_time ?? "",
    target_version: feature?.target_version ?? "",
    start_date: feature?.start_date ?? "",
    target_date: feature?.target_date ?? "",
    acceptance_criteria: feature?.acceptance_criteria ?? "",
    labels: parseLabels(feature?.labels),
  });
  const [labelSearch, setLabelSearch] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    try {
      const data: Record<string, unknown> = { ...form };
      if (Array.isArray(data.labels)) data.labels = JSON.stringify(data.labels);
      if (!data.start_date) data.start_date = null;
      if (!data.target_date) data.target_date = null;
      if (!data.sprint_id) data.sprint_id = null;
      if (!data.release_id) data.release_id = null;
      if (!data.category) data.category = null;
      if (!data.epic) data.epic = null;
      if (!data.estimated_time) data.estimated_time = null;
      if (!data.target_version) data.target_version = null;
      if (!data.acceptance_criteria) data.acceptance_criteria = null;

      if (isEditing) {
        await update.mutateAsync({ id: feature!.id, ...data });
        island.success("Updated", `"${form.title}" updated.`);
      } else {
        await create.mutateAsync(data);
        island.success("Created", `"${form.title}" added to roadmap.`);
      }
      onClose();
      onRefresh();
    } catch {
      island.error("Failed", `Could not ${isEditing ? "update" : "create"} feature.`);
    }
  };

  const toggleLabel = (l: string) => {
    setForm((f) => ({
      ...f,
      labels: f.labels.includes(l) ? f.labels.filter((x: string) => x !== l) : [...f.labels, l],
    }));
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c]/95 backdrop-blur-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500/20 to-zinc-700/20 border border-white/10">
                  {isEditing ? <Pencil className="h-4 w-4 text-blue-400" /> : <Sparkles className="h-4 w-4 text-purple-400" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{isEditing ? "Edit" : "New"} Feature</h2>
                  <p className="text-xs text-zinc-500">{isEditing ? "Update feature details" : "Add a new feature to the roadmap"}</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Feature title" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this feature..." rows={2} className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Acceptance Criteria</Label>
                  <Textarea value={form.acceptance_criteria} onChange={(e) => setForm({ ...form, acceptance_criteria: e.target.value })} placeholder="What defines this feature as complete?" rows={2} className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2"><span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />{STATUS_LABELS[s]}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}><span className={cn(PRIORITY_COLORS[p])}>{PRIORITY_LABELS[p]}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. AI, Editor" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Epic</Label>
                  <Input value={form.epic} onChange={(e) => setForm({ ...form, epic: e.target.value })} placeholder="Epic name" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Owner</Label>
                  <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Assignee" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Progress %</Label>
                  <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="border-white/10 bg-white/5 text-white h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Estimated Time</Label>
                  <Input value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} placeholder="e.g. 2 weeks" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Target Version</Label>
                  <Input value={form.target_version} onChange={(e) => setForm({ ...form, target_version: e.target.value })} placeholder="e.g. v1.0" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">ETA</Label>
                  <Input value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} placeholder="e.g. Q3 2026" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Start Date</Label>
                  <Input type="date" value={form.start_date?.split("T")[0] || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value || "" })} className="border-white/10 bg-white/5 text-white h-9 [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Target Date</Label>
                  <Input type="date" value={form.target_date?.split("T")[0] || ""} onChange={(e) => setForm({ ...form, target_date: e.target.value || "" })} className="border-white/10 bg-white/5 text-white h-9 [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Sprint</Label>
                  <Select value={form.sprint_id} onValueChange={(v) => setForm({ ...form, sprint_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(sprints ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Release</Label>
                  <Select value={form.release_id} onValueChange={(v) => setForm({ ...form, release_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(releases ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name} ({r.version})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-400">Labels</Label>
                  <Input value={labelSearch} onChange={(e) => setLabelSearch(e.target.value)} placeholder="Search labels..." className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9 mb-2" />
                  <div className="flex gap-1.5 flex-wrap">
                    {(labels ?? []).filter((l) => !labelSearch || l.toLowerCase().includes(labelSearch.toLowerCase())).map((l) => (
                      <button key={l} onClick={() => toggleLabel(l)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-full border transition-colors",
                          form.labels.includes(l)
                            ? "bg-zinc-500/20 border-zinc-500/40 text-zinc-300"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-300"
                        )}
                      >{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-zinc-300 hover:bg-white/5">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title.trim() || create.isPending || update.isPending} className="flex-1 bg-gradient-to-r from-zinc-500 to-zinc-700 hover:from-blue-600 hover:to-purple-700 text-white border-0">
                {(create.isPending || update.isPending) && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Feature"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

function SprintManager({ onClose }: { onClose: () => void }) {
  const { data: sprints } = useRoadmapSprints();
  const createSprint = useCreateSprint();
  const closeSprint = useCloseSprint();
  const island = useIslandNotification();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createSprint.mutateAsync({ name: name.trim() });
      island.success("Sprint created", "");
      setName("");
    } catch { island.error("Failed", "Could not create sprint."); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint name..." className="border-white/10 bg-white/5 text-white h-9"
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
        />
        <Button size="sm" onClick={handleCreate} disabled={!name.trim()} className="bg-zinc-600 hover:bg-zinc-700 text-white border-0"><Plus className="h-4 w-4" /></Button>
      </div>
      {(sprints ?? []).map((s) => (
        <div key={s.id} className="flex items-center justify-between text-xs py-1.5">
          <div>
            <span className="text-zinc-200">{s.name}</span>
            <Badge variant="outline" className="ml-2 text-[9px] border-white/10">{s.status}</Badge>
          </div>
          {s.status !== "closed" && (
            <button onClick={async () => { await closeSprint.mutateAsync(s.id); island.info("Sprint closed", ""); }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors">Close</button>
          )}
        </div>
      ))}
    </div>
  );
}

function ReleaseManager({ onClose }: { onClose: () => void }) {
  const { data: releases } = useRoadmapReleases();
  const createRelease = useCreateRelease();
  const publishRelease = usePublishRelease();
  const island = useIslandNotification();
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !version.trim()) return;
    try {
      await createRelease.mutateAsync({ name: name.trim(), version: version.trim() });
      island.success("Release created", "");
      setName(""); setVersion("");
    } catch { island.error("Failed", "Could not create release."); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name..." className="border-white/10 bg-white/5 text-white h-9 flex-1" />
        <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0" className="border-white/10 bg-white/5 text-white h-9 w-24" />
        <Button size="sm" onClick={handleCreate} disabled={!name.trim() || !version.trim()} className="bg-zinc-600 hover:bg-zinc-700 text-white border-0"><Plus className="h-4 w-4" /></Button>
      </div>
      {(releases ?? []).map((r) => (
        <div key={r.id} className="flex items-center justify-between text-xs py-1.5">
          <div>
            <span className="text-zinc-200">{r.name}</span>
            <span className="text-zinc-500 ml-1">({r.version})</span>
            <Badge variant="outline" className="ml-2 text-[9px] border-white/10">{r.status}</Badge>
          </div>
          {r.status === "planned" && (
            <button onClick={async () => { await publishRelease.mutateAsync({ id: r.id }); island.success("Release published", ""); }}
              className="text-zinc-300 hover:text-zinc-200 transition-colors">Publish</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Roadmap() {
  const { confirm } = useConfirmDialog();
  const island = useIslandNotification();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState<RoadmapFeature | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<RoadmapFeature | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSprintManager, setShowSprintManager] = useState(false);
  const [showReleaseManager, setShowReleaseManager] = useState(false);

  const { data: result, isLoading, refetch } = useRoadmapFeatures(
    Object.keys(filters).length > 0 ? filters : undefined,
    search || undefined,
    "created_at", "desc"
  );
  const { data: stats, refetch: refetchStats } = useRoadmapStats();
  const { data: sprints } = useRoadmapSprints();
  const { data: releases } = useRoadmapReleases();
  const deleteFeature = useDeleteRoadmapFeature();
  const { data: voteCounts } = useRoadmapVoteCounts();

  const features = result?.data ?? [];

  const filtered = useMemo(() => {
    let f = features;
    if (filters.status && filters.status !== "all") f = f.filter((x) => x.status === filters.status);
    if (filters.priority && filters.priority !== "all") f = f.filter((x) => x.priority === filters.priority);
    if (filters.owner) f = f.filter((x) => x.owner?.toLowerCase().includes(filters.owner!.toLowerCase()));
    return f;
  }, [features, filters]);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  const handleDelete = async (feature: RoadmapFeature) => {
    if (!await confirm({
      title: "Delete Feature", description: `Permanently delete "${feature.title}"? This cannot be undone.`,
      variant: "delete", confirmText: "Delete",
    })) return;
    try {
      await deleteFeature.mutateAsync(feature.id);
      island.success("Deleted", `"${feature.title}" has been deleted.`);
      handleRefresh();
    } catch { island.error("Failed", "Could not delete feature."); }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Roadmap" description="Product development hub" />
        <LoadingState count={6} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Roadmap</h1>
          <p className="text-sm text-white/50 mt-0.5">Plan, track, and manage feature development</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSprintManager(!showSprintManager)} className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-xs h-8">
            <Zap className="mr-1 h-3.5 w-3.5" />Sprints
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReleaseManager(!showReleaseManager)} className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-xs h-8">
            <Rocket className="mr-1 h-3.5 w-3.5" />Releases
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-white hover:bg-white/80 text-black font-semibold border-0 h-8 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Feature
          </Button>
        </div>
      </div>

      {/* Sprint/Release Managers */}
      <AnimatePresence>
        {showSprintManager && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/10 bg-black/40">
              <SprintManager onClose={() => setShowSprintManager(false)} />
            </Card>
          </motion.div>
        )}
        {showReleaseManager && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/10 bg-black/40">
              <ReleaseManager onClose={() => setShowReleaseManager(false)} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <StatsCards stats={stats} />
      <SprintReleaseBar stats={stats} sprints={sprints ?? []} releases={releases ?? []} />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search features..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-white/10 bg-black/40 text-white placeholder:text-white/30 focus-visible:ring-white/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("border-white/20 text-white/60 hover:bg-white/10 hover:text-white text-xs h-9", showFilters && "border-white/40 bg-white/10")}>
            <Filter className="mr-1 h-3.5 w-3.5" />Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/50">Status</Label>
                  <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
                    <SelectTrigger className="border-white/10 bg-black/40 text-white h-8 text-xs w-32"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/50">Priority</Label>
                  <Select value={filters.priority || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? "" : v }))}>
                    <SelectTrigger className="border-white/10 bg-black/40 text-white h-8 text-xs w-32"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-xs text-white/50 hover:text-white h-8">
                    <X className="mr-1 h-3 w-3" />Clear
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onSelect={setSelectedFeature}
                onEdit={setEditingFeature}
                onDelete={handleDelete}
                voteCounts={voteCounts ?? {}}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div>
          <EmptyState
            title={search || Object.keys(filters).length > 0 ? "No matching features" : "Start building your roadmap"}
            description={search || Object.keys(filters).length > 0 ? "Try adjusting your search or filters." : "Create your first feature to start tracking progress."}
          />
          {!search && Object.keys(filters).length === 0 && (
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-zinc-500 to-zinc-700 text-white border-0">
                <Plus className="mr-1.5 h-4 w-4" /> Add Feature
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && <FeatureFormModal onClose={() => setShowForm(false)} onRefresh={handleRefresh} />}
        {editingFeature && (
          <FeatureFormModal key="edit" feature={editingFeature} onClose={() => setEditingFeature(null)} onRefresh={handleRefresh} />
        )}
        {selectedFeature && (
          <FeatureDetailPanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} onRefresh={handleRefresh} voteCounts={voteCounts ?? {}} />
        )}
      </AnimatePresence>
    </div>
  );
}
