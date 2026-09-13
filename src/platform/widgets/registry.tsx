/**
 * Widget registry — the single source of truth for what this build can
 * render. Powers the picker, the layout normalizer, the config sheets and
 * availability resolution.
 */
import type { WidgetCategory, WidgetDefinition } from "./types";
import {
  MyTasksWidget,
  MY_TASKS_CONFIG_SCHEMA,
  QuickCreateWidget,
  RecentPagesWidget,
  UpcomingTasksWidget,
  StickyNoteWidget,
} from "./widgets/productivity";
import {
  FavoritesWidget,
  PinnedItemsWidget,
  RecentActivityWidget,
  WorkspaceOverviewWidget,
} from "./widgets/workspace";
import {
  AiActivityWidget,
  AiQuickAskWidget,
  AiUsageWidget,
  AiNeuralHubWidget,
} from "./widgets/ai";
import {
  AttentionRequiredWidget,
  MentionsWidget,
  UnreadNotificationsWidget,
} from "./widgets/notifications";
import {
  MilestonesWidget,
  ProjectProgressWidget,
  SprintVelocityWidget,
} from "./widgets/projects";
import {
  ConnectionStatusWidget,
  SyncStatusWidget,
  WorldClockWidget,
  AmbientSoundscapesWidget,
} from "./widgets/system";
import { IntegrationsHubWidget } from "./widgets/integrations";
import {
  StreakTrackerWidget,
  FocusTimerWidget,
  ActivityGraphWidget,
  ProgressRingsWidget,
  VitalityBatteryWidget,
  HabitMatrixWidget,
} from "./widgets/gamified";

export const WIDGET_CATEGORIES: WidgetCategory[] = [
  "productivity",
  "gamified",
  "ai",
  "workspace",
  "project",
  "notifications",
  "integrations",
  "system",
];

const DEFINITIONS: WidgetDefinition[] = [
  // ── Productivity ──
  {
    id: "quick-create",
    name: "Quick Create",
    description: "Start a page, task, document, database or AI generation in one click.",
    category: "productivity",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: QuickCreateWidget,
  },
  {
    id: "my-tasks",
    name: "My Tasks",
    description: "Tasks due today, overdue counts and quick complete.",
    category: "productivity",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    defaultConfig: { showOverdue: true, sortBy: "priority" },
    configSchema: MY_TASKS_CONFIG_SCHEMA,
    enabledByDefault: true,
    component: MyTasksWidget,
  },
  {
    id: "upcoming-tasks",
    name: "Upcoming Tasks",
    description: "What's due today, tomorrow and beyond, with quick actions.",
    category: "productivity",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: UpcomingTasksWidget,
  },
  {
    id: "recent-pages",
    name: "Recent Pages",
    description: "Jump back into recently opened or edited pages.",
    category: "productivity",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: RecentPagesWidget,
  },
  {
    id: "sticky-note",
    name: "Sticky Note",
    description: "Tactile pastel notepad for quick brain dumps with one-click page conversion.",
    category: "productivity",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: StickyNoteWidget,
  },

  // ── Gamified & Dynamic Visuals ──
  {
    id: "streak-tracker",
    name: "Streak Tracker",
    description: "Duolingo-style daily streak with animated 3D flame, weekly shields & celebration particles.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: StreakTrackerWidget,
  },
  {
    id: "focus-timer",
    name: "Liquid Focus Timer",
    description: "Liquid glowing focus ring with 15m Sprint, 25m Deep Work, and 50m Flow modes.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: FocusTimerWidget,
  },
  {
    id: "vitality-battery",
    name: "Vitality Battery",
    description: "Dynamic cognitive energy meter paced by focus sprints and break rhythms.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: VitalityBatteryWidget,
  },
  {
    id: "habit-matrix",
    name: "Daily Habits",
    description: "Track essential daily micro-habits with spring bounce checkmarks.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: HabitMatrixWidget,
  },
  {
    id: "activity-graph",
    name: "Activity Graph",
    description: "Animated bar graph of your pages and tasks touched each day this week.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: ActivityGraphWidget,
  },
  {
    id: "progress-rings",
    name: "Progress Rings",
    description: "Apple Watch style triple progress rings for pages, tasks, and focus.",
    category: "gamified",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: false,
    component: ProgressRingsWidget,
  },

  // ── AI ──
  {
    id: "ai-neural-hub",
    name: "AI Neural Co-Pilot",
    description: "Pulsing 3D neural sphere with soundwave equalizer and quick prompt runner.",
    category: "ai",
    supportedSizes: ["medium", "large"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: AiNeuralHubWidget,
  },
  {
    id: "ai-activity",
    name: "AI Activity",
    description: "Running, completed and failing agents and automations.",
    category: "ai",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    enabledByDefault: false,
    component: AiActivityWidget,
  },
  {
    id: "ai-quick-ask",
    name: "AI Quick Ask",
    description: "Compact AI prompt entry point for the workspace.",
    category: "ai",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: AiQuickAskWidget,
  },
  {
    id: "ai-usage",
    name: "AI Usage",
    description: "Your requests, tokens and latency at a glance.",
    category: "ai",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: AiUsageWidget,
  },

  // ── Workspace ──
  {
    id: "workspace-overview",
    name: "Workspace Overview",
    description: "Name, pages, tasks and recent activity at a glance.",
    category: "workspace",
    supportedSizes: ["small", "medium", "wide"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: WorkspaceOverviewWidget,
  },
  {
    id: "recent-activity",
    name: "Recent Activity",
    description: "Edits, comments and task changes across the workspace.",
    category: "workspace",
    supportedSizes: ["medium", "large", "wide"],
    defaultSize: "wide",
    enabledByDefault: false,
    component: RecentActivityWidget,
  },
  {
    id: "favorites",
    name: "Favorites",
    description: "Your starred pages and documents.",
    category: "workspace",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: true,
    component: FavoritesWidget,
  },
  {
    id: "pinned-items",
    name: "Pinned Items",
    description: "Pin the resources you reach for constantly.",
    category: "workspace",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: PinnedItemsWidget,
  },

  // ── Notifications ──
  {
    id: "unread-notifications",
    name: "Notifications",
    description: "Unread notifications with quick mark-as-read.",
    category: "notifications",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: UnreadNotificationsWidget,
  },
  {
    id: "mentions",
    name: "Mentions",
    description: "Recent comments and mentions of you, one click to jump.",
    category: "notifications",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: false,
    component: MentionsWidget,
  },
  {
    id: "attention-required",
    name: "Attention Required",
    description: "Overdue tasks, failed automations and pending approvals that need you.",
    category: "notifications",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    enabledByDefault: false,
    component: AttentionRequiredWidget,
  },

  // ── Projects ──
  {
    id: "sprint-velocity",
    name: "Sprint Velocity",
    description: "Sprint completion progress bar and velocity points tracker.",
    category: "project",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: SprintVelocityWidget,
  },
  {
    id: "project-progress",
    name: "Project Progress",
    description: "Completion and health for your project databases.",
    category: "project",
    supportedSizes: ["small", "medium", "large"],
    defaultSize: "medium",
    enabledByDefault: false,
    component: ProjectProgressWidget,
  },
  {
    id: "milestones",
    name: "Milestones",
    description: "Next milestone, due date and completion count.",
    category: "project",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: MilestonesWidget,
  },

  // ── System & Ambient ──
  {
    id: "world-clock",
    name: "Apple World Clock",
    description: "Analog chronometer with rotating sweep hand and multi-timezone cities.",
    category: "system",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: WorldClockWidget,
  },
  {
    id: "ambient-soundscapes",
    name: "Ambient Soundscapes",
    description: "Lofi rain, deep forest, cozy cafe, and ocean wave sound generator.",
    category: "system",
    supportedSizes: ["small", "medium"],
    defaultSize: "medium",
    enabledByDefault: true,
    component: AmbientSoundscapesWidget,
  },
  {
    id: "sync-status",
    name: "Sync Status",
    description: "Whether this workspace is synced, syncing or offline.",
    category: "system",
    supportedSizes: ["small"],
    defaultSize: "small",
    enabledByDefault: false,
    component: SyncStatusWidget,
  },
  {
    id: "connection-status",
    name: "Connection",
    description: "Online and offline indicator.",
    category: "system",
    supportedSizes: ["small"],
    defaultSize: "small",
    enabledByDefault: false,
    component: ConnectionStatusWidget,
  },
  {
    id: "integrations-hub",
    name: "Integrations",
    description: "Status of your connected integrations.",
    category: "integrations",
    supportedSizes: ["small", "medium"],
    defaultSize: "small",
    enabledByDefault: false,
    component: IntegrationsHubWidget,
  },
];

export const WIDGET_REGISTRY: Map<string, WidgetDefinition> = new Map(
  DEFINITIONS.map((def) => [def.id, def]),
);

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.get(id);
}

export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return DEFINITIONS;
}
