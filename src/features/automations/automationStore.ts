/**
 * Automations — Persistence Store
 *
 * CRUD for automations backed by the `automations` table (owner-scoped RLS)
 * with a localStorage mirror. An automation is a deterministic workflow:
 * trigger + conditions + ordered steps (AI steps and/or direct tool calls).
 */

import { supabase } from "../../lib/supabase";
import { uid } from "../../utils/blockModel";
import type { ConditionGroup, PermissionSpec, TriggerSpec } from "../../ai/runtime/types";
import { defaultPermissions } from "../../ai/runtime/types";
import { isValidTrigger } from "../../ai/runtime/scheduler";
import { getOwnerId } from "../agents/agentStore";

export interface AutomationStep {
  id: string;
  label: string;
  kind: "ai_step" | "tool" | "approval";
  instruction?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
}

export interface NoskaAutomation {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "active" | "paused";
  trigger: TriggerSpec;
  conditions: ConditionGroup | null;
  steps: AutomationStep[];
  permissions: PermissionSpec;
  timezone: string;
  missedPolicy: "run_immediately" | "skip" | "run_once_latest" | "catch_up";
  nextRunAt?: string | null;
  lastStatus?: string | null;
  failureStreak: number;
  health: "healthy" | "warning" | "failing" | "disabled" | "waiting_approval";
  lastRunAt?: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

const MIRROR_KEY = "noska_automations";

// ─── Mapping ───────────────────────────────────────────────────────────────

interface AutomationRow {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status?: string | null;
  trigger_config?: Record<string, unknown> | null;
  conditions?: Record<string, unknown> | null;
  steps?: AutomationStep[] | null;
  permissions?: Record<string, unknown> | null;
  last_run_at?: string | null;
  run_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function rowToAutomation(row: AutomationRow): NoskaAutomation {
  const trigger = isValidTrigger(row.trigger_config) ? row.trigger_config : { type: "manual" as const };
  return {
    id: row.id,
    name: row.name || "Untitled Automation",
    description: row.description || "",
    icon: row.icon || "⚡",
    status: row.status === "paused" ? "paused" : "active",
    trigger,
    conditions: (row.conditions as unknown as ConditionGroup) || null,
    steps: Array.isArray(row.steps) ? row.steps : [],
    permissions: { ...defaultPermissions(), ...((row.permissions as Partial<PermissionSpec>) || {}) },
    timezone: (row as { timezone?: string }).timezone || "UTC",
    missedPolicy: (row as { missed_policy?: NoskaAutomation["missedPolicy"] }).missed_policy || "run_once_latest",
    nextRunAt: (row as { next_run_at?: string | null }).next_run_at || null,
    lastStatus: (row as { last_status?: string | null }).last_status ?? null,
    failureStreak: (row as { failure_streak?: number }).failure_streak || 0,
    health: ((row as { health?: NoskaAutomation["health"] }).health || "healthy"),
    lastRunAt: row.last_run_at || null,
    runCount: row.run_count || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function automationToInsert(a: NoskaAutomation): Record<string, unknown> {
  return {
    id: a.id,
    owner_id: "",
    workspace_id: "",
    name: a.name,
    description: a.description,
    icon: a.icon,
    status: a.status,
    trigger_config: a.trigger,
    conditions: a.conditions || { op: "and", conditions: [] },
    steps: a.steps,
    permissions: a.permissions,
    timezone: a.timezone,
    missed_policy: a.missedPolicy,
    next_run_at: a.nextRunAt ?? null,
    last_status: a.lastStatus ?? null,
    failure_streak: a.failureStreak,
    health: a.status === "paused" ? "disabled" : a.health,
    last_run_at: a.lastRunAt || null,
    run_count: a.runCount,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

// ─── Mirror ────────────────────────────────────────────────────────────────

function loadMirror(): NoskaAutomation[] {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(rowToAutomation) : [];
  } catch {
    return [];
  }
}

function saveMirror(list: NoskaAutomation[]): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(list));
  } catch { /* best-effort */ }
}

// ─── Public API ────────────────────────────────────────────────────────────

export function blankAutomation(partial: Partial<NoskaAutomation> = {}): NoskaAutomation {
  const nowIso = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    description: "",
    icon: "⚡",
    status: "paused",
    trigger: { type: "manual" },
    conditions: null,
    steps: [],
    permissions: { ...defaultPermissions(), agents: "disabled", automations: "disabled" },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    missedPolicy: "run_once_latest",
    failureStreak: 0,
    health: "healthy",
    runCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...partial,
  };
}

export async function fetchAutomations(): Promise<NoskaAutomation[]> {
  try {
    const { data, error } = await supabase.from("automations").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      const list = (data as unknown as AutomationRow[]).map(rowToAutomation);
      saveMirror(list);
      return list;
    }
  } catch { /* fall through */ }
  return loadMirror();
}

export async function saveAutomation(a: NoskaAutomation): Promise<NoskaAutomation> {
  const updated: NoskaAutomation = { ...a, updatedAt: new Date().toISOString() };
  const mirror = loadMirror();
  const idx = mirror.findIndex((x) => x.id === updated.id);
  if (idx >= 0) mirror[idx] = updated;
  else mirror.unshift(updated);
  saveMirror(mirror);

  try {
    const payload = automationToInsert(updated);
    payload.owner_id = (await getOwnerId()) || "";
    const { error } = await supabase.from("automations").upsert(payload as never, { onConflict: "id" });
    if (error) console.warn("[automations] remote save failed:", error.message);
  } catch (err) {
    console.warn("[automations] remote save failed:", err);
  }
  return updated;
}

export async function deleteAutomationById(id: string): Promise<void> {
  saveMirror(loadMirror().filter((a) => a.id !== id));
  try {
    await supabase.from("automation_runs").delete().eq("automation_id", id);
    const { error } = await supabase.from("automations").delete().eq("id", id);
    if (error) console.warn("[automations] remote delete failed:", error.message);
  } catch { /* mirror already updated */ }
}

/** Stamp run metadata after an execution (fire-and-forget). */
export async function noteAutomationRan(id: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const mirror = loadMirror();
  const idx = mirror.findIndex((a) => a.id === id);
  if (idx >= 0) {
    mirror[idx] = { ...mirror[idx], lastRunAt: nowIso, runCount: (mirror[idx].runCount || 0) + 1 };
    saveMirror(mirror);
  }
  try {
    const ownerId = (await getOwnerId()) || "";
    await supabase.from("automations").update({
      last_run_at: nowIso,
      run_count: (mirror[idx]?.runCount || 1),
      updated_at: nowIso,
      owner_id: ownerId,
    } as never).eq("id", id);
  } catch { /* best-effort */ }
}

// ─── Templates ─────────────────────────────────────────────────────────────

export const AUTOMATION_TEMPLATES: Array<{ key: string; name: string; description: string; icon: string; triggerLabel: string; build: () => NoskaAutomation }> = [
  {
    key: "task_completion",
    name: "Task Completion Summary",
    description: "When a task is completed → summarize it and log to a report page.",
    icon: "✅",
    triggerLabel: "Task completed",
    build: () => blankAutomation({
      name: "Task Completion Summary",
      description: "Summarizes completed tasks into a running completion log.",
      trigger: { type: "task_completed" },
      steps: [
        { id: uid(), label: "Summarize completed task", kind: "ai_step", instruction: "Write a one-paragraph summary of the completed task: what was done and any follow-ups." },
        { id: uid(), label: "Log to completion report", kind: "tool", toolName: "append_blocks", toolParams: { content: "- {{ai.response}}" } },
      ],
    }),
  },
  {
    key: "weekly_report",
    name: "Weekly Report",
    description: "Every Friday → compile progress across recent pages.",
    icon: "📊",
    triggerLabel: "Every Friday · 4:00 PM",
    build: () => blankAutomation({
      name: "Weekly Report",
      description: "Compiles weekly progress into a report page.",
      trigger: { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 5, hour: 16, minute: 0 } },
      steps: [
        { id: uid(), label: "Review week's changes", kind: "ai_step", instruction: "Review recently updated pages and completed todos. Note wins, blockers, and next steps." },
        { id: uid(), label: "Create weekly report page", kind: "ai_step", instruction: "Create a 'Weekly Report' page with this week's date containing the summary." },
      ],
    }),
  },
  {
    key: "overdue_reminder",
    name: "Overdue Task Reminder",
    description: "Daily → find overdue todos and create a recovery plan.",
    icon: "⏰",
    triggerLabel: "Every day · 9:00 AM",
    build: () => blankAutomation({
      name: "Overdue Task Reminder",
      description: "Surfaces overdue work each morning.",
      trigger: { type: "schedule", schedule: { kind: "every_day", hour: 9, minute: 0 } },
      steps: [
        { id: uid(), label: "Find overdue items", kind: "ai_step", instruction: "List open todo blocks that appear stale or overdue. If none, reply 'No overdue items' and stop." },
        { id: uid(), label: "Build recovery plan page", kind: "ai_step", instruction: "If overdue items exist, create a short 'Recovery Plan' page prioritizing them." },
      ],
    }),
  },
  {
    key: "new_project_setup",
    name: "New Project Setup",
    description: "When a project page is created → scaffold goals & tasks sections.",
    icon: "🚀",
    triggerLabel: "Page created",
    build: () => blankAutomation({
      name: "New Project Setup",
      description: "Scaffolds structure onto new project pages.",
      trigger: { type: "page_created" },
      conditions: { op: "and", conditions: [{ field: "event.pageTitle", op: "contains", value: "project" }] },
      steps: [
        { id: uid(), label: "Add project scaffolding", kind: "tool", toolName: "append_blocks", toolParams: { content: "## 🎯 Goals\n- \n\n## 📋 Tasks\n- [ ] \n\n## 🚧 Blockers\n- \n" } },
      ],
    }),
  },
];
