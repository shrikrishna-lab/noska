/**
 * Custom Agents — Persistence Store
 *
 * CRUD for user-created agents backed by Supabase (agents + agent_triggers
 * tables, owner-scoped RLS) with a localStorage fallback mirror so the UI
 * works offline / pre-migration. The agent's full configuration (trigger,
 * permissions, context scope, limits) is stored in the `config` jsonb
 * column; legacy columns stay in sync where they exist.
 */

import { supabase } from "../../lib/supabase";
import { uid } from "../../utils/blockModel";
import type { PermissionSpec, TriggerSpec } from "../../ai/runtime/types";
import { defaultPermissions } from "../../ai/runtime/types";
import { isValidTrigger } from "../../ai/runtime/scheduler";

export type MemoryMode = "off" | "run" | "persistent";

export interface NoskaAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  instructions: string;
  status: "active" | "paused";
  modelClass: "fast" | "default" | "reasoning";
  trigger: TriggerSpec;
  contextScope: string[];
  permissions: PermissionSpec;
  /** off → no recall/persist · run → recall for this run only · persistent → full loop */
  memoryMode: MemoryMode;
  maxRunsPerHour: number;
  notifyOnRun: boolean;
  createdAt: string;
  updatedAt: string;
}

const MIRROR_KEY = "noska_custom_agents";

const ownerIdCache: { value: string | null } = { value: null };

export async function getOwnerId(): Promise<string | null> {
  if (ownerIdCache.value) return ownerIdCache.value;
  try {
    const { data } = await supabase.auth.getUser();
    ownerIdCache.value = data?.user?.id || null;
    return ownerIdCache.value;
  } catch {
    return null;
  }
}

// ─── Mapping ────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  instructions?: string | null;
  status?: string | null;
  model?: string | null;
  config?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function rowToAgent(row: AgentRow): NoskaAgent {
  const config = ((row.config || {}) as Partial<NoskaAgent>) ?? {};
  const triggerRaw = (config as { trigger?: unknown }).trigger;
  const trigger = isValidTrigger(triggerRaw) ? triggerRaw : { type: "manual" as const };
  return {
    id: row.id,
    name: row.name || "Untitled Agent",
    description: row.description || "",
    icon: row.icon || "🤖",
    instructions: row.instructions || "",
    status: row.status === "paused" ? "paused" : "active",
    modelClass: (config.modelClass as NoskaAgent["modelClass"]) || "default",
    trigger,
    contextScope: Array.isArray(config.contextScope) ? config.contextScope : [],
    permissions: { ...defaultPermissions(), ...(config.permissions || {}) },
    memoryMode: config.memoryMode === "off" || config.memoryMode === "run" ? config.memoryMode : "persistent",
    maxRunsPerHour: typeof config.maxRunsPerHour === "number" ? config.maxRunsPerHour : 12,
    notifyOnRun: config.notifyOnRun !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function agentToInsert(agent: NoskaAgent): Record<string, unknown> {
  return {
    id: agent.id,
    type: "custom",
    owner_id: "", // stamped server-side by RLS check; actual value set below
    workspace_id: "",
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    instructions: agent.instructions,
    status: agent.status,
    model: agent.modelClass,
    config: {
      modelClass: agent.modelClass,
      trigger: agent.trigger,
      contextScope: agent.contextScope,
      permissions: agent.permissions,
      memoryMode: agent.memoryMode,
      maxRunsPerHour: agent.maxRunsPerHour,
      notifyOnRun: agent.notifyOnRun,
    },
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  };
}

// ─── Mirror ────────────────────────────────────────────────────────────────

export function loadMirrorAgents(): NoskaAgent[] {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(rowToAgent) : [];
  } catch {
    return [];
  }
}

function saveMirrorAgents(agents: NoskaAgent[]): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(agents));
  } catch { /* best-effort */ }
}

// ─── Public API ────────────────────────────────────────────────────────────

export function blankAgent(partial: Partial<NoskaAgent> = {}): NoskaAgent {
  const nowIso = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    description: "",
    icon: "🤖",
    instructions: "",
    status: "paused",
    modelClass: "default",
    trigger: { type: "manual" },
    contextScope: [],
    permissions: defaultPermissions(),
    memoryMode: "persistent",
    maxRunsPerHour: 12,
    notifyOnRun: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...partial,
  };
}

/** Clone with a fresh identity — execution history is NOT copied (#9). */
export function cloneAgent(source: NoskaAgent, overrides: Partial<NoskaAgent> = {}): NoskaAgent {
  const nowIso = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(source)),
    id: uid(),
    name: `${source.name} (copy)`,
    status: "paused", // clones start paused — never silently active
    createdAt: nowIso,
    updatedAt: nowIso,
    ...overrides,
  };
}

export async function fetchAgents(): Promise<NoskaAgent[]> {
  try {
    const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      const agents = (data as unknown as AgentRow[]).map(rowToAgent);
      saveMirrorAgents(agents);
      return agents;
    }
    if (!error && data && data.length === 0) {
      // Fresh account — but don't clobber a non-empty mirror (offline edits).
      const mirrored = loadMirrorAgents();
      if (mirrored.length === 0) saveMirrorAgents([]);
      return mirrored;
    }
  } catch { /* fall through */ }
  return loadMirrorAgents();
}

export async function saveAgent(agent: NoskaAgent): Promise<NoskaAgent> {
  const updated: NoskaAgent = { ...agent, updatedAt: new Date().toISOString() };
  const mirror = loadMirrorAgents();
  const idx = mirror.findIndex((a) => a.id === updated.id);
  if (idx >= 0) mirror[idx] = updated;
  else mirror.unshift(updated);
  saveMirrorAgents(mirror);

  try {
    const payload = agentToInsert(updated);
    payload.owner_id = (await getOwnerId()) || "";
    const { error } = await supabase.from("agents").upsert(payload as never, { onConflict: "id" });
    if (error) console.warn("[agents] remote save failed:", error.message);
  } catch (err) {
    console.warn("[agents] remote save failed:", err);
  }
  return updated;
}

export async function deleteAgentById(id: string): Promise<void> {
  saveMirrorAgents(loadMirrorAgents().filter((a) => a.id !== id));
  try {
    await supabase.from("agent_triggers").delete().eq("agent_id", id);
    await supabase.from("agent_access_grants").delete().eq("agent_id", id);
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) console.warn("[agents] remote delete failed:", error.message);
  } catch { /* mirror already updated */ }
}

// ─── Templates ─────────────────────────────────────────────────────────────

export interface AgentTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Marketplace foundation (#33): browseable grouping. */
  category: TemplateCategory;
  useCase: string;
  capabilities: string[];
  exampleTasks: string[];
  exampleOutput: string;
  instructions: string;
  triggerLabel: string;
  trigger: TriggerSpec;
  contextScope: string[];
  permissions: PermissionSpec;
  memoryScopeSuggestion: MemoryMode;
}

export type TemplateCategory =
  | "Personal" | "Study" | "Research" | "Writing" | "Development"
  | "Projects" | "Productivity" | "Marketing" | "Operations" | "Data";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Personal", "Study", "Research", "Writing", "Development",
  "Projects", "Productivity", "Marketing", "Operations", "Data",
];

/** Permission → human capability lines derived from the REAL permission spec.
 * The install preview renders these; nothing cosmetic (#8/#10/#39). */
export function capabilitiesFromPermissions(permissions: PermissionSpec): { can: string[]; cannot: string[] } {
  const labels: Record<string, [string, string]> = {
    read: ["Read pages & content", "Read anything"],
    create: ["Create new pages", "Create anything"],
    update: ["Edit pages & content", "Edit existing content"],
    delete: ["Move pages to trash (with approval)", "Delete anything"],
    memory: ["Remember facts between runs", "Persist any memories"],
    agents: ["Delegate to other agents (with approval)", "Manage other agents"],
    automations: ["Manage automations (with approval)", "Change your automations"],
    external: ["Send you in-app notifications (with approval)", "Use external services"],
  };
  const can: string[] = [];
  const cannot: string[] = [];
  for (const [cat, mode] of Object.entries(permissions)) {
    const pair = labels[cat] ?? [cat, cat];
    if (mode === "auto") can.push(pair[0]);
    else if (mode === "approval") can.push(pair[0]);
    else cannot.push(pair[1]);
  }
  return { can, cannot };
}

const T = (category: TemplateCategory, t: Omit<AgentTemplate, "category">): AgentTemplate => ({ category, ...t });

export const AGENT_TEMPLATES: AgentTemplate[] = [
  T("Productivity", {
    key: "daily_planner",
    name: "Daily Planner",
    description: "Reviews tasks each morning and creates a prioritized daily plan.",
    icon: "📅",
    useCase: "Start every workday with a clear plan instead of scanning pages.",
    capabilities: ["Analyze open tasks", "Detect overdue work", "Prioritize by urgency", "Create the plan page"],
    exampleTasks: ["Plan my day around the launch deadline"],
    exampleOutput: "A dated Daily Plan page: top 3 priorities, tasks grouped by project, blockers flagged.",
    instructions: "Every run: read open todos across pages, identify overdue and high-priority items, then create a 'Daily Plan' page with today's date containing a prioritized task list. Verify the page was created and report the top 3 priorities.",
    triggerLabel: "Every weekday · 8:00 AM",
    trigger: { type: "schedule", schedule: { kind: "every_weekday", hour: 8, minute: 0 } },
    contextScope: ["Tasks", "Projects", "Recent pages"],
    permissions: { read: "auto", create: "auto", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "approval" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Projects", {
    key: "project_manager",
    name: "Project Manager",
    description: "Monitors projects, detects overdue work and blockers, reports progress.",
    icon: "📈",
    useCase: "Keep every project honest — progress computed from real task state.",
    capabilities: ["Monitor tasks across projects", "Detect overdue work", "Summarize progress %", "Identify blockers", "Write weekly progress sections"],
    exampleTasks: ["How is the launch tracking?", "Which projects are at risk this week?"],
    exampleOutput: "Progress section appended per project page: % complete, overdue list, top blockers.",
    instructions: "Every run: find pages tagged 'project', read their todos and structure, compute progress from checked/unchecked tasks, list blockers, and append a short progress section to each project page. Never delete anything.",
    triggerLabel: "Every day · 6:00 PM",
    trigger: { type: "schedule", schedule: { kind: "every_day", hour: 18, minute: 0 } },
    contextScope: ["Projects", "Tasks"],
    permissions: { read: "auto", create: "auto", update: "auto", delete: "approval", memory: "auto", agents: "disabled", automations: "disabled", external: "approval" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Development", {
    key: "bug_triage",
    name: "Bug Triage",
    description: "Assesses new bug reports and tags severity automatically.",
    icon: "🐞",
    useCase: "Every new bug gets a consistent severity assessment within minutes.",
    capabilities: ["Analyze bug reports", "Assess severity", "Tag priority P0–P3", "Write one-line assessments"],
    exampleTasks: ["Triage the bugs from today's feedback page"],
    exampleOutput: "Priority tag added + assessment line at the top of each bug page.",
    instructions: "When triggered: find recently created pages tagged or titled like bugs, analyze severity from their content, add a priority tag (P0-P3) and a one-line assessment at the top of the page.",
    triggerLabel: "When a page is created",
    trigger: { type: "page_created" },
    contextScope: ["Bug tracker"],
    permissions: { read: "auto", create: "disabled", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Operations", {
    key: "weekly_reporter",
    name: "Weekly Reporter",
    description: "Compiles a Friday summary of everything that changed.",
    icon: "📊",
    useCase: "End every week with a written record of wins, blockers and next steps.",
    capabilities: ["Review week's changes", "Compile structured reports", "Track completed vs. planned", "Publish report pages"],
    exampleTasks: ["Write this week's report"],
    exampleOutput: "Weekly Report page: wins, progress, blockers, next week's focus.",
    instructions: "Every Friday afternoon: review recently updated pages and completed todos from the past week, write a structured weekly report page (wins, progress, blockers, next week), then verify it exists.",
    triggerLabel: "Every Friday · 4:00 PM",
    trigger: { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 5, hour: 16, minute: 0 } },
    contextScope: ["All pages", "Recent activity"],
    permissions: { read: "auto", create: "auto", update: "disabled", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "approval" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Study", {
    key: "study_coach",
    name: "Study Coach",
    description: "Turns notes into flashcards, finds weak topics, builds review plans.",
    icon: "🎓",
    useCase: "Convert lecture notes into an active-recall system that improves every week.",
    capabilities: ["Analyze study notes", "Generate question cards", "Identify weak topics", "Create study plans"],
    exampleTasks: ["Make flashcards from yesterday's lecture", "What should I review before Friday's exam?"],
    exampleOutput: "Q/A todo pairs appended to source notes + a prioritized review plan page.",
    instructions: "Every run: find pages tagged 'study', extract key concepts, generate question-answer pairs, and append them as todo items formatted as flashcards on the source page. Flag concepts that appear weak or repeated.",
    triggerLabel: "Every day · 7:00 PM",
    trigger: { type: "schedule", schedule: { kind: "every_day", hour: 19, minute: 0 } },
    contextScope: ["Study notes"],
    permissions: { read: "auto", create: "disabled", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Research", {
    key: "research_assistant",
    name: "Research Assistant",
    description: "Synthesizes workspace knowledge into structured research notes.",
    icon: "🔍",
    useCase: "Ask questions across everything you've written and get sourced synthesis.",
    capabilities: ["Analyze workspace knowledge", "Summarize documents", "Connect related pages", "Flag gaps and contradictions"],
    exampleTasks: ["Research everything I have on authentication approaches"],
    exampleOutput: "A research note page: findings by theme, sources linked, open questions listed.",
    instructions: "When triggered: search the workspace for pages related to the topic, read them, synthesize findings into a structured research note page with themes, citations to source page titles, and open questions. Distinguish workspace facts from your reasoning.",
    triggerLabel: "Manual runs",
    trigger: { type: "manual" },
    contextScope: ["Whole workspace"],
    permissions: { read: "auto", create: "auto", update: "disabled", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "run",
  }),
  T("Productivity", {
    key: "meeting_assistant",
    name: "Meeting Assistant",
    description: "Converts meeting notes into owners, actions and follow-ups.",
    icon: "🎙️",
    useCase: "No decision gets lost between the meeting and Monday.",
    capabilities: ["Extract decisions", "Create action items", "Assign owners where identifiable", "Add follow-up sections"],
    exampleTasks: ["Process today's standup notes"],
    exampleOutput: "Todos created from action items + Follow-ups section on the meeting page.",
    instructions: "When triggered: read the meeting-notes page, extract decisions and action items, create clear todo items with owners where identifiable, and add a follow-ups section.",
    triggerLabel: "Manual runs",
    trigger: { type: "manual" },
    contextScope: ["Meeting notes"],
    permissions: { read: "auto", create: "auto", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "run",
  }),
  T("Personal", {
    key: "knowledge_organizer",
    name: "Knowledge Organizer",
    description: "Keeps the workspace tidy: tags, links, and structure.",
    icon: "🧹",
    useCase: "A self-maintaining wiki instead of a growing pile of untagged pages.",
    capabilities: ["Find untagged pages", "Apply content-based tags", "Detect orphan pages", "Suggest connections"],
    exampleTasks: ["Clean up my untagged notes"],
    exampleOutput: "Tags applied conservatively + a suggestions list of links it didn't auto-create.",
    instructions: "Every run: scan for untagged pages, suggest and apply tags based on content; detect orphan pages and link them to related ones. Be conservative — never trash anything without explicit duplicate evidence.",
    triggerLabel: "Weekly · Sunday 10:00 AM",
    trigger: { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 0, hour: 10, minute: 0 } },
    contextScope: ["Whole workspace"],
    permissions: { read: "auto", create: "disabled", update: "auto", delete: "approval", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Marketing", {
    key: "crm_assistant",
    name: "CRM Assistant",
    description: "Tracks contacts and flags relationships going cold.",
    icon: "🤝",
    useCase: "Never let an important relationship silently go stale again.",
    capabilities: ["Track last-contact dates", "Flag cold contacts (14+ days)", "Draft follow-up suggestions"],
    exampleTasks: ["Which leads haven't I contacted in two weeks?"],
    exampleOutput: "Follow-up suggestion appended to each cold contact page.",
    instructions: "Every run: find contact/company pages, check last-contact dates in content, flag contacts not touched in 14+ days, and append suggested follow-up actions to those pages.",
    triggerLabel: "Every weekday · 9:00 AM",
    trigger: { type: "schedule", schedule: { kind: "every_weekday", hour: 9, minute: 0 } },
    contextScope: ["CRM pages"],
    permissions: { read: "auto", create: "disabled", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Writing", {
    key: "content_planner",
    name: "Content Planner",
    description: "Maintains a living content calendar and drafts outlines.",
    icon: "✍️",
    useCase: "A publishing pipeline that refills itself from your ideas pages.",
    capabilities: ["Collect idea pages", "Draft post outlines", "Maintain a content calendar", "Flag stale drafts"],
    exampleTasks: ["Plan next month's posts from my ideas pages"],
    exampleOutput: "Content Calendar page updated + outlines drafted for the top 3 ideas.",
    instructions: "Every run: collect pages tagged 'idea' or 'draft', rank by freshness and completeness, maintain a Content Calendar page, and draft outlines for the strongest candidates.",
    triggerLabel: "Weekly · Monday 9:00 AM",
    trigger: { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 1, hour: 9, minute: 0 } },
    contextScope: ["Ideas", "Drafts"],
    permissions: { read: "auto", create: "auto", update: "auto", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "persistent",
  }),
  T("Data", {
    key: "data_steward",
    name: "Data Steward",
    description: "Watches databases for incomplete records and quality issues.",
    icon: "🗃️",
    useCase: "Databases stay clean without manual audits.",
    capabilities: ["Scan database records", "Detect missing fields", "Report quality issues", "Propose cleanup steps"],
    exampleTasks: ["Audit my task database for missing due dates"],
    exampleOutput: "Data Quality report page listing incomplete records by database.",
    instructions: "Every run: locate database blocks in the workspace, check records for empty important fields and inconsistent values, then write a Data Quality report page listing issues by database with suggested fixes. Read-only over content; never edit records directly.",
    triggerLabel: "Weekly · Saturday 11:00 AM",
    trigger: { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 6, hour: 11, minute: 0 } },
    contextScope: ["Databases"],
    permissions: { read: "auto", create: "auto", update: "disabled", delete: "disabled", memory: "auto", agents: "disabled", automations: "disabled", external: "disabled" },
    memoryScopeSuggestion: "run",
  }),
];

/** Marketplace foundation (#33): versioned template descriptors for future
 * third-party publishing. Not exposed publicly yet by design. */
export interface TemplateDescriptor extends AgentTemplate {
  templateId: string;
  version: string;
  author: string;
}

export function describeTemplate(t: AgentTemplate): TemplateDescriptor {
  return { ...t, templateId: `noska.${t.key}`, version: "1.0.0", author: "Noska Labs" };
}

export function templateToAgent(template: AgentTemplate): NoskaAgent {
  return blankAgent({
    name: template.name,
    description: template.description,
    icon: template.icon,
    instructions: template.instructions,
    trigger: template.trigger,
    contextScope: [...template.contextScope],
    permissions: { ...template.permissions },
    memoryMode: template.memoryScopeSuggestion,
  });
}

// ─── Unified row view (single source of truth for ALL agent surfaces) ──────

/** Minimal legacy-column shape the Agents workspace renders. */
export interface AgentRowLike {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  instructions: string | null;
  model: string | null;
  status: string | null;
  type: string;
}

function agentToRowLike(a: NoskaAgent): AgentRowLike {
  return {
    id: a.id,
    owner_id: "",
    name: a.name,
    description: a.description || null,
    icon: a.icon || null,
    instructions: a.instructions || null,
    model: a.modelClass,
    status: a.status,
    type: "custom",
  };
}

/**
 * One loader for every surface (workspace tabs, trigger service, library).
 * Reads the DB when reachable; merges/falls back to the offline mirror so
 * agents remain visible and runnable even without Supabase.
 */
export async function fetchAgentsUnified(): Promise<AgentRowLike[]> {
  const unified = new Map<string, AgentRowLike>();
  // Mirror first (offline-safe baseline)
  for (const a of loadMirrorAgents()) unified.set(a.id, agentToRowLike(a));
  // Remote rows win where present (they carry legacy-column state too)
  try {
    const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      for (const raw of data as unknown as Array<Record<string, unknown>>) {
        const asNoska = rowToAgent(raw as unknown as AgentRow);
        unified.set(asNoska.id, agentToRowLike(asNoska));
      }
    }
  } catch { /* offline — mirror stands */ }
  return [...unified.values()];
}

/** Persist through the unified store from legacy-row callers. */
export async function saveAgentFromRow(row: {
  id?: string; name: string; description?: string | null; icon?: string | null;
  instructions?: string | null; model?: string | null; status?: string | null;
}): Promise<AgentRowLike> {
  const existing = row.id ? loadMirrorAgents().find((a) => a.id === row.id) : undefined;
  const base = existing || blankAgent({ name: row.name });
  const saved = await saveAgent({
    ...base,
    name: row.name ?? base.name,
    description: row.description ?? base.description,
    icon: row.icon ?? base.icon,
    instructions: row.instructions ?? base.instructions,
    modelClass: (row.model as NoskaAgent["modelClass"]) || base.modelClass,
    status: row.status === "active" ? "active" : "paused",
  });
  return agentToRowLike(saved);
}

/** Toggle/delete helpers routed through the unified store. */
export async function setAgentStatus(id: string, status: "active" | "paused"): Promise<boolean> {
  const all = loadMirrorAgents();
  const target = all.find((a) => a.id === id);
  if (!target) return false;
  await saveAgent({ ...target, status });
  return true;
}

export async function removeAgent(id: string): Promise<void> {
  await deleteAgentById(id);
}

/**
 * Pick the best default target page for an agent run (#8 Notion-like UX):
 * scores pages against the agent's contextScope words + instructions so
 * "Run now" acts on the obvious page instead of asking the user.
 */
export function findBestTargetPage(
  pages: Array<{ id: string; title?: string; tags?: unknown[]; trashed?: boolean; updatedAt?: string | null }>,
  agent: { name: string; description?: string | null; instructions?: string | null; contextScope?: string[] }
): { id: string; title: string } | null {
  const stop = new Set(["the","and","for","with","this","that","from","your","you","are","was","were","into","onto","page","pages","agent","every","when","run","each"]);
  const wordsOf = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  const scopeWords = new Set<string>([
    ...(agent.contextScope || []).flatMap(wordsOf),
    ...wordsOf(agent.name),
    ...wordsOf(agent.description || ""),
    ...wordsOf(agent.instructions || "").slice(0, 40),
  ]);
  let best: { id: string; title: string; score: number } | null = null;
  for (const p of pages) {
    if (p.trashed) continue;
    const hay = `${p.title || ""} ${(p.tags as string[] | undefined)?.join(" ") || ""}`.toLowerCase();
    const titleWords = new Set(wordsOf(p.title || ""));
    let score = 0;
    for (const w of scopeWords) {
      if (titleWords.has(w)) score += 3;
      else if ((p.tags as string[] | undefined)?.some(t => String(t).toLowerCase().includes(w))) score += 2;
      else if (hay.includes(w)) score += 1;
    }
    if (!best || score > best.score) best = { id: p.id, title: p.title || "Untitled", score };
  }
  // Require a meaningful match; otherwise no default target.
  return best && best.score >= 3 ? { id: best.id, title: best.title } : null;
}
