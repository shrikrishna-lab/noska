import { useState, useCallback, useMemo } from "react";
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, Pencil, Trash2, Search, Filter, GripVertical,
  LayoutGrid, List, CalendarDays, Clock, ArrowUp, AlertTriangle,
  Circle, User, GitBranch, MessageSquare, CheckSquare, Paperclip,
  Sparkles, Flag, BarChart3, Eye, EyeOff, MoreHorizontal,
  ChevronDown, ChevronRight, Zap, Target, Layers, Box, Rocket,
  Calendar, ArrowRight, Link2, Columns3, ThumbsUp,
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
  KANBAN_STATUSES,
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

type ViewMode = "board" | "list" | "timeline";

// ─── Constants ───

const PRIORITY_ICONS: Record<string, typeof ArrowUp> = {
  critical: AlertTriangle, high: ArrowUp, medium: ArrowUp, low: ArrowUp, nice_to_have: Circle,
};
const PRIORITY_CLASS: Record<string, string> = {
  critical: "text-zinc-100", high: "text-zinc-300", medium: "text-zinc-400",
  low: "text-zinc-500", nice_to_have: "text-zinc-600",
};
const PRIORITY_BG: Record<string, string> = {
  critical: "bg-zinc-500/15", high: "bg-zinc-500/15", medium: "bg-zinc-500/15",
  low: "bg-zinc-500/10", nice_to_have: "bg-zinc-500/10",
};

// ─── Helpers ───
function parseLabels(labels: unknown): string[] {
  if (Array.isArray(labels)) return labels;
  if (typeof labels === "string") { try { return JSON.parse(labels); } catch { return []; } }
  return [];
}

// ─── Sortable Card ───

function SortableFeatureCard({ feature, onSelect, voteCounts }: { feature: RoadmapFeature; onSelect: (f: RoadmapFeature) => void; voteCounts: Record<string, number> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feature.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FeatureCard feature={feature} onSelect={onSelect} isDragging={isDragging} voteCounts={voteCounts} />
    </div>
  );
}

function FeatureCard({ feature, onSelect, isDragging, isDraught, voteCounts }: { feature: RoadmapFeature; onSelect: (f: RoadmapFeature) => void; isDragging?: boolean; isDraught?: boolean; voteCounts?: Record<string, number> }) {
  const PrioIcon = PRIORITY_ICONS[feature.priority] ?? ArrowUp;
  const statusColor = STATUS_COLORS[feature.status] || STATUS_COLORS.backlog;
  const [statusLabel] = statusColor.split(" ");

  return (
    <motion.div layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={cn(
          "group cursor-pointer border transition-all duration-150",
          isDragging ? "opacity-50 scale-95 border-zinc-500/40 shadow-lg shadow-zinc-500/10" : "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04]"
        )}
        onClick={() => onSelect(feature)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <GripVertical className="h-3.5 w-3.5 text-zinc-700 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-sm font-medium text-zinc-100 truncate">{feature.title}</span>
              </div>
              {feature.description && (
                <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2 leading-relaxed">{feature.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("flex items-center gap-1 text-[10px]", statusLabel || "text-zinc-400")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[feature.status] || "bg-zinc-400")} />
                  {STATUS_LABELS[feature.status] || feature.status}
                </span>
                <span className={cn("flex items-center gap-0.5 text-[10px]", PRIORITY_CLASS[feature.priority] || "text-zinc-500")}>
                  <PrioIcon className="h-3 w-3" />
                  {PRIORITY_LABELS[feature.priority] || feature.priority}
                </span>
                {feature.owner && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <User className="h-3 w-3" />{feature.owner}
                  </span>
                )}
                {voteCounts && voteCounts[feature.id] > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <ThumbsUp className="h-3 w-3" />{voteCounts[feature.id]}
                  </span>
                )}
              </div>
              {parseLabels(feature.labels).length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {parseLabels(feature.labels).slice(0, 3).map((l) => (
                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">{l}</span>
                  ))}
                  {parseLabels(feature.labels).length > 3 && <span className="text-[9px] text-zinc-600">+{parseLabels(feature.labels).length - 3}</span>}
                </div>
              )}
              {feature.progress > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={feature.progress} className="h-1 flex-1 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-zinc-400 [&>div]:to-zinc-600" />
                  <span className="text-[9px] font-mono text-zinc-500">{feature.progress}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Dashboard Analytics ───

function StatsCards({ stats }: { stats: RoadmapStats | null | undefined }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Features", value: stats.total, icon: Box, color: "text-zinc-100", bg: "bg-zinc-500/10" },
    { label: "In Progress", value: stats.in_progress, icon: Zap, color: "text-zinc-300", bg: "bg-zinc-500/10" },
    { label: "Planned", value: stats.planned, icon: Target, color: "text-zinc-200", bg: "bg-zinc-500/10" },
    { label: "Released", value: stats.released, icon: Sparkles, color: "text-zinc-100", bg: "bg-zinc-500/10" },
    { label: "Blocked", value: stats.blocked, icon: AlertTriangle, color: "text-zinc-500", bg: "bg-zinc-500/10" },
    { label: "Overdue", value: stats.overdue, icon: Clock, color: "text-zinc-500", bg: "bg-zinc-500/10" },
    { label: "Backlog", value: stats.backlog, icon: Layers, color: "text-zinc-400", bg: "bg-zinc-500/10" },
    {
      label: "Completions", value: `${stats.completion_pct}%`, icon: BarChart3,
      color: "text-zinc-200", bg: "bg-zinc-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", c.bg)}>
                  <Icon className={cn("h-4 w-4", c.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{c.label}</p>
                  <p className={cn("text-lg font-bold", c.color)}>{c.value}</p>
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
    <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-zinc-400">
      {activeSprint && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
          <Zap className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-300 font-medium">Sprint:</span>
          <span>{activeSprint.name}</span>
          {activeSprint.end_date && (
            <span className="text-zinc-500">
              (ends {new Date(activeSprint.end_date).toLocaleDateString()})
            </span>
          )}
        </div>
      )}
      {upcomingRelease && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
          <Rocket className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-300 font-medium">Release:</span>
          <span>{upcomingRelease.name} ({upcomingRelease.version})</span>
        </div>
      )}
      {stats && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
          <BarChart3 className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-300 font-medium">{stats.completion_pct}%</span>
          <span className="text-zinc-500">complete</span>
        </div>
      )}
    </div>
  );
}

// ─── Board View (Kanban) ───

function BoardView({
  features, onSelect, onRefresh, voteCounts,
}: {
  features: RoadmapFeature[]; onSelect: (f: RoadmapFeature) => void; onRefresh: () => void; voteCounts: Record<string, number>;
}) {
  const updateStatus = useUpdateRoadmapStatus();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    const map: Record<string, RoadmapFeature[]> = {};
    for (const s of KANBAN_STATUSES) map[s] = [];
    for (const f of features) {
      if (map[f.status]) map[f.status].push(f);
    }
    return map;
  }, [features]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const featureId = active.id as string;
    const targetColumn = over.id as string;
    if (KANBAN_STATUSES.includes(targetColumn as never) && featureId !== targetColumn) {
      const feature = features.find((f) => f.id === featureId);
      if (feature && feature.status !== targetColumn) {
        updateStatus.mutate({ id: featureId, status: targetColumn });
      }
    }
  }, [features, updateStatus]);

  const activeFeature = activeId ? features.find((f) => f.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {KANBAN_STATUSES.map((status) => {
          const items = grouped[status] || [];
          return (
            <div key={status} className="flex-shrink-0 w-64">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl mb-2 border", STATUS_COLORS[status] || "text-zinc-400 bg-zinc-500/10 border-zinc-500/20")}>
                <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status] || "bg-zinc-400")} />
                <span className="text-xs font-semibold">{STATUS_LABELS[status] || status}</span>
                <span className="ml-auto text-[10px] font-mono opacity-60">{items.length}</span>
              </div>
              <SortableContext items={items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[100px]">
                  <AnimatePresence>
                    {items.map((feature) => (
                      <SortableFeatureCard key={feature.id} feature={feature} onSelect={onSelect} voteCounts={voteCounts} />
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <div className="h-20 rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                      <p className="text-[10px] text-zinc-600">Drop items here</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeFeature && <div className="w-64 opacity-90"><FeatureCard feature={activeFeature} onSelect={() => {}} isDraught={true} voteCounts={voteCounts} /></div>}
      </DragOverlay>
    </DndContext>
  );
}

// ─── List View ───

function ListView({ features, onSelect, voteCounts }: { features: RoadmapFeature[]; onSelect: (f: RoadmapFeature) => void; voteCounts: Record<string, number> }) {
  return (
    <div className="space-y-1">
      {features.map((f) => {
        const PrioIcon = PRIORITY_ICONS[f.priority] ?? ArrowUp;
        return (
          <motion.div
            key={f.id} layout
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.06] group"
            onClick={() => onSelect(f)}
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[f.status] || "bg-zinc-400")} />
            <span className="flex-1 text-sm text-zinc-100 truncate">{f.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              {parseLabels(f.labels).length > 0 && (
                <div className="hidden md:flex gap-1">
                  {parseLabels(f.labels).slice(0, 2).map((l) => (
                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">{l}</span>
                  ))}
                </div>
              )}
              {f.progress > 0 && (
                <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 w-8 text-right">{f.progress}%</span>
              )}
              <span className={cn("flex items-center gap-0.5 text-[10px]", PRIORITY_CLASS[f.priority] || "text-zinc-500")}>
                <PrioIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{PRIORITY_LABELS[f.priority] || f.priority}</span>
              </span>
              {f.owner && (
                <span className="hidden lg:flex items-center gap-1 text-[10px] text-zinc-500">
                  <User className="h-3 w-3" />{f.owner}
                </span>
              )}
              {voteCounts[f.id] > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <ThumbsUp className="h-3 w-3" />{voteCounts[f.id]}
                </span>
              )}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", STATUS_COLORS[f.status]?.split(" ")[0] || "text-zinc-400")}>
                {STATUS_LABELS[f.status] || f.status}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Timeline View ───

function TimelineView({ features, onSelect, voteCounts }: { features: RoadmapFeature[]; onSelect: (f: RoadmapFeature) => void; voteCounts: Record<string, number> }) {
  const withDates = useMemo(() => features.filter((f) => f.start_date || f.target_date), [features]);
  const sorted = useMemo(() => [...withDates].sort((a, b) => {
    const aDate = a.start_date || a.target_date || a.created_at;
    const bDate = b.start_date || b.target_date || b.created_at;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  }), [withDates]);

  const minDate = sorted.length > 0 ? new Date(sorted[0].start_date || sorted[0].created_at) : new Date();
  const maxDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].target_date || sorted[sorted.length - 1].created_at) : new Date();
  const range = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const months: Date[] = [];
  const d = new Date(minDate);
  d.setDate(1);
  while (d <= maxDate) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }

  return (
    <div className="space-y-4">
      {sorted.length === 0 && <EmptyState title="No features with dates" description="Add start or target dates to features to see them on a timeline." />}
      {sorted.map((f) => {
        const start = f.start_date ? new Date(f.start_date) : minDate;
        const end = f.target_date ? new Date(f.target_date) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        const leftPct = ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / range * 100;
        const widthPct = Math.max(2, ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / range * 100);
        return (
          <div key={f.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.03] rounded-lg px-3 py-2 transition-colors" onClick={() => onSelect(f)}>
            <div className="w-48 shrink-0">
              <p className="text-sm text-zinc-100 truncate">{f.title}</p>
            </div>
            <div className="flex-1 h-8 relative">
              <div className="absolute inset-0 border-t border-white/5" style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: "20px" }}>
                <div className={cn("h-2 rounded-full mt-3", PRIORITY_BG[f.priority] || "bg-zinc-500/20")}>
                  <div className={cn("h-full rounded-full", f.progress > 0 ? `w-[${f.progress}%]` : "w-0", f.status === "shipped" ? "bg-zinc-400" : "bg-zinc-600")} style={f.progress > 0 ? { width: `${f.progress}%` } : {}} />
                </div>
              </div>
            </div>
            <div className="w-24 shrink-0 text-right">
              <span className="text-[10px] text-zinc-500">
                {f.start_date ? new Date(f.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                {f.target_date ? ` - ${new Date(f.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Feature Detail Side Panel ───

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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", PRIORITY_BG[feature.priority] || "bg-zinc-500/10")}>
                  {(() => { const Icon = PRIORITY_ICONS[feature.priority] ?? ArrowUp; return <Icon className={cn("h-4 w-4", PRIORITY_CLASS[feature.priority])} />; })()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">{feature.title}</h2>
                  <span className={cn("text-[10px]", STATUS_COLORS[feature.status]?.split(" ")[0] || "text-zinc-400")}>{STATUS_LABELS[feature.status] || feature.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(!editing)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 px-5">
              <div className="flex gap-4 text-xs">
                {["details", "checklist", "comments", "activity"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "py-3 border-b-2 transition-colors capitalize",
                      activeTab === tab ? "text-white border-zinc-400" : "text-zinc-500 border-transparent hover:text-zinc-300"
                    )}
                  >
                    {tab === "details" && "Details"}
                    {tab === "checklist" && `Checklist (${checklists?.length || 0})`}
                    {tab === "comments" && `Comments (${comments?.length || 0})`}
                    {tab === "activity" && "Activity"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {activeTab === "details" && (
                  <>
                    {editing ? (
                      <div className="space-y-3">
                        <div><Label className="text-xs text-zinc-400">Title</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></div>
                        <div><Label className="text-xs text-zinc-400">Description</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="border-white/10 bg-white/5 text-white resize-none" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs text-zinc-400">Priority</Label>
                            <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                              <SelectTrigger className="border-white/10 bg-white/5 text-white h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map((p) => (
                                  <SelectItem key={p} value={p}><span className={cn(PRIORITY_COLORS[p])}>{PRIORITY_LABELS[p]}</span></SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label className="text-xs text-zinc-400">Owner</Label><Input value={editForm.owner} onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs text-zinc-400">ETA</Label><Input value={editForm.eta} onChange={(e) => setEditForm({ ...editForm, eta: e.target.value })} className="border-white/10 bg-white/5 text-white h-9" /></div>
                          <div><Label className="text-xs text-zinc-400">Progress %</Label><Input type="number" value={editForm.progress} onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })} className="border-white/10 bg-white/5 text-white h-9" /></div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-zinc-300 flex-1">Cancel</Button>
                          <Button onClick={handleSave} disabled={!editForm.title.trim() || updateMutation.isPending} className="flex-1 bg-gradient-to-r from-zinc-500 to-zinc-700 text-white border-0">
                            {updateMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Section label="Description">
                          <p className="text-sm text-zinc-300 leading-relaxed">{feature.description || "No description."}</p>
                        </Section>
                        <div className="grid grid-cols-2 gap-4">
                          <Section label="Priority">
                            <span className={cn("text-sm font-medium", PRIORITY_CLASS[feature.priority])}>{PRIORITY_LABELS[feature.priority] || feature.priority}</span>
                          </Section>
                          <Section label="Owner"><span className="text-sm text-zinc-300">{feature.owner || "Unassigned"}</span></Section>
                          <Section label="Progress">
                            <div className="flex items-center gap-2">
                              <Progress value={feature.progress} className="h-1.5 flex-1 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-zinc-400 [&>div]:to-zinc-600" />
                              <span className="text-xs font-mono text-zinc-400">{feature.progress}%</span>
                            </div>
                          </Section>
                          <Section label="ETA"><span className="text-sm text-zinc-300">{feature.eta || "Not set"}</span></Section>
                          <Section label="Status"><span className={cn("text-sm font-medium", STATUS_COLORS[feature.status]?.split(" ")[0])}>{STATUS_LABELS[feature.status] || feature.status}</span></Section>
                          <Section label="Votes"><span className="text-sm text-zinc-300">{voteCounts?.[feature.id] ?? 0}</span></Section>
                          <Section label="Category"><span className="text-sm text-zinc-300">{feature.category || "Uncategorized"}</span></Section>
                          {parseLabels(feature.labels).length > 0 && (
                            <div className="col-span-2">
                              <SectionLabel>Labels</SectionLabel>
                              <div className="flex gap-1.5 mt-1 flex-wrap">
                                {parseLabels(feature.labels).map((l) => (
                                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">{l}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {deps && deps.length > 0 && (
                            <div className="col-span-2">
                              <SectionLabel>Dependencies</SectionLabel>
                              <div className="space-y-1 mt-1">
                                {deps.map((d) => (
                                  <div key={d.id} className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Link2 className="h-3 w-3" />{d.depends_on_title} <Badge variant="outline" className="text-[9px] border-white/10">{d.dependency_type}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {feature.acceptance_criteria && (
                          <Section label="Acceptance Criteria">
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{feature.acceptance_criteria}</p>
                          </Section>
                        )}
                      </>
                    )}
                  </>
                )}

                {activeTab === "checklist" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={checklistTitle} onChange={(e) => setChecklistTitle(e.target.value)} placeholder="Add checklist item..." className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 h-9 text-sm flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklist(); }}
                      />
                      <Button size="sm" onClick={handleAddChecklist} disabled={!checklistTitle.trim()} className="bg-zinc-600 hover:bg-zinc-700 text-white border-0 h-9">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(checklists ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-2.5 group">
                        <input
                          type="checkbox" checked={item.completed} onChange={() => toggleChecklist.mutate({ id: item.id, completed: !item.completed })}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500 cursor-pointer"
                        />
                        <span className={cn("text-sm flex-1", item.completed && "line-through text-zinc-600")}>{item.title}</span>
                        <Badge variant="outline" className="text-[9px] border-white/10 text-zinc-500">{item.section}</Badge>
                      </div>
                    ))}
                    {(!checklists || checklists.length === 0) && <p className="text-xs text-zinc-500">No checklist items yet.</p>}
                  </div>
                )}

                {activeTab === "comments" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..."
                        rows={2} className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none text-sm"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()} className="bg-zinc-600 hover:bg-zinc-700 text-white border-0 h-8 text-xs">
                          {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Send
                        </Button>
                      </div>
                    </div>
                    {(comments ?? []).map((c) => (
                      <div key={c.id} className="border-l-2 border-white/10 pl-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center text-[8px] font-bold text-white">
                            {c.author_name.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-zinc-200">{c.author_name}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{c.content}</p>
                      </div>
                    ))}
                    {(!comments || comments.length === 0) && <p className="text-xs text-zinc-500">No comments yet.</p>}
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="space-y-3">
                    {(activity ?? []).map((a) => (
                      <div key={a.id} className="flex items-start gap-3 text-xs">
                        <div className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          a.action === "created" ? "bg-zinc-500/10" : a.action === "moved" ? "bg-zinc-500/10" : "bg-zinc-500/10"
                        )}>
                          {a.action === "created" ? <Sparkles className="h-3 w-3 text-zinc-400" /> :
                           a.action === "moved" ? <ArrowRight className="h-3 w-3 text-zinc-400" /> : <Pencil className="h-3 w-3 text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-zinc-300">{a.actor_name} </span>
                          <span className="text-zinc-500">
                            {a.action === "created" ? "created this feature" :
                             a.action === "moved" ? `moved from "${a.old_value || "?"}" to "${a.new_value || "?"}"` :
                             `updated ${a.field_name}`}
                          </span>
                          <p className="text-zinc-600 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {(!activity || activity.length === 0) && <p className="text-xs text-zinc-500">No activity yet.</p>}
                  </div>
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
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{children}</p>;
}

// ─── Create/Edit Modal ───

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

// ─── Sprint/Release Quick Managers ───

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

// ─── Main Page ───

export function Roadmap() {
  const { confirm } = useConfirmDialog();
  const island = useIslandNotification();
  const [view, setView] = useState<ViewMode>("board");
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
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Roadmap</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Plan, track, and manage feature development</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSprintManager(!showSprintManager)} className="border-white/10 text-zinc-300 hover:bg-white/5 text-xs h-8">
            <Zap className="mr-1 h-3.5 w-3.5" />Sprints
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReleaseManager(!showReleaseManager)} className="border-white/10 text-zinc-300 hover:bg-white/5 text-xs h-8">
            <Rocket className="mr-1 h-3.5 w-3.5" />Releases
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-zinc-500 to-zinc-700 hover:from-zinc-600 hover:to-zinc-800 text-white border-0 shadow-lg shadow-zinc-500/20 h-8 text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Feature
          </Button>
        </div>
      </div>

      {/* Sprint/Release Managers */}
      <AnimatePresence>
        {showSprintManager && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <SprintManager onClose={() => setShowSprintManager(false)} />
            </Card>
          </motion.div>
        )}
        {showReleaseManager && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <ReleaseManager onClose={() => setShowReleaseManager(false)} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <StatsCards stats={stats} />
      <SprintReleaseBar stats={stats} sprints={sprints ?? []} releases={releases ?? []} />

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search features..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("border-white/10 text-zinc-300 hover:bg-white/5 text-xs h-9", showFilters && "border-zinc-500/40 bg-zinc-500/10")}>
            <Filter className="mr-1 h-3.5 w-3.5" />Filters
          </Button>
          <div className="flex rounded-lg border border-white/10 p-0.5 bg-white/[0.02]">
            {(["board", "list", "timeline"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] transition-colors",
                  view === v ? "bg-white/10 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {v === "board" && <LayoutGrid className="h-3 w-3" />}
                {v === "list" && <List className="h-3 w-3" />}
                {v === "timeline" && <CalendarDays className="h-3 w-3" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-500">Status</Label>
                  <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-8 text-xs w-32"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-500">Priority</Label>
                  <Select value={filters.priority || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? "" : v }))}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-8 text-xs w-32"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-xs text-zinc-500 hover:text-zinc-300 h-8">
                    <X className="mr-1 h-3 w-3" />Clear
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {filtered.length > 0 ? (
        <>
          {view === "board" && <BoardView features={filtered} onSelect={setSelectedFeature} onRefresh={handleRefresh} voteCounts={voteCounts ?? {}} />}
          {view === "list" && <ListView features={filtered} onSelect={setSelectedFeature} voteCounts={voteCounts ?? {}} />}
          {view === "timeline" && <TimelineView features={filtered} onSelect={setSelectedFeature} voteCounts={voteCounts ?? {}} />}
        </>
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

