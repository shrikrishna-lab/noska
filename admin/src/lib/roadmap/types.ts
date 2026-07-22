export interface RoadmapFeature {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  priority: string;
  progress: number;
  owner: string | null;
  eta: string | null;
  labels: string[] | null;
  category: string | null;
  epic: string | null;
  sprint_id: string | null;
  release_id: string | null;
  estimated_time: string | null;
  target_version: string | null;
  start_date: string | null;
  target_date: string | null;
  sort_order: number;
  dependencies: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
}

export interface RoadmapSprint {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface RoadmapRelease {
  id: string;
  name: string;
  version: string;
  description: string | null;
  release_notes: string | null;
  status: string;
  released_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RoadmapComment {
  id: string;
  feature_id: string;
  author_name: string;
  author_id: string | null;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RoadmapChecklistItem {
  id: string;
  feature_id: string;
  title: string;
  section: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface RoadmapActivity {
  id: string;
  feature_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_name: string;
  actor_id: string | null;
  created_at: string;
}

export interface RoadmapDependency {
  id: string;
  feature_id: string;
  depends_on_id: string;
  depends_on_title: string;
  dependency_type: string;
  created_at: string;
}

export interface RoadmapAttachment {
  id: string;
  feature_id: string;
  name: string;
  type: string;
  url: string;
  created_at: string;
}

export interface RoadmapStats {
  total: number;
  backlog: number;
  planned: number;
  in_progress: number;
  review: number;
  blocked: number;
  released: number;
  overdue: number;
  completion_pct: number;
  current_sprint: string;
  upcoming_release: string;
}

export interface RoadmapSelectResult {
  data: RoadmapFeature[];
  total: number;
  page: number;
  page_size: number;
}

export const STATUSES = [
  "idea", "backlog", "planned", "design", "development",
  "testing", "review", "blocked", "ready", "shipped", "archived", "cancelled",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  backlog: "Backlog",
  planned: "Planned",
  design: "Design",
  development: "Development",
  testing: "Testing",
  review: "Review",
  blocked: "Blocked",
  ready: "Ready to Release",
  shipped: "Released",
  archived: "Archived",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  idea: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  backlog: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  planned: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  design: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  development: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  testing: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  review: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  blocked: "text-red-400 bg-red-500/10 border-red-500/20",
  ready: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  shipped: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  cancelled: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export const STATUS_DOT: Record<string, string> = {
  idea: "bg-purple-400",
  backlog: "bg-slate-400",
  planned: "bg-blue-400",
  design: "bg-violet-400",
  development: "bg-amber-400",
  testing: "bg-cyan-400",
  review: "bg-indigo-400",
  blocked: "bg-red-400",
  ready: "bg-teal-400",
  shipped: "bg-emerald-400",
  archived: "bg-zinc-500",
  cancelled: "bg-rose-400",
};

export const PRIORITIES = ["critical", "high", "medium", "low", "nice_to_have"] as const;
export const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  nice_to_have: "Nice to Have",
};
export const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  nice_to_have: "text-slate-400",
};

export const KANBAN_STATUSES = ["idea", "backlog", "planned", "design", "development", "testing", "review", "blocked", "ready", "shipped", "archived"];
