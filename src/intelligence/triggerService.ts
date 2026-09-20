/**
 * Noska Intelligence — Trigger Service
 *
 * Subscribes to workspace events and evaluates schedules, then launches
 * agent/automation runs through the shared AgentRuntime. This is what makes
 * agents "keep working" while the workspace is open.
 *
 * Scope honesty: the browser cannot run jobs when the tab is closed. The
 * service runs while Noska is open (which covers interactive sessions and
 * typical workdays) — missed schedules are detected on load via the
 * last-occurrence rule in scheduler.ts and fire once, late but exactly once.
 */

import { subscribeWorkspaceEvents } from "../ai/runtime/eventBus";
import { agentRuntime } from "../ai/runtime/AgentRuntime";
import { isScheduleDue } from "../ai/runtime/scheduler";
import type { WorkspaceEvent } from "../ai/runtime/types";
import { fetchAgents, saveAgent, type NoskaAgent } from "../features/agents/agentStore";
import { fetchAutomations, noteAutomationRan, saveAutomation, type NoskaAutomation } from "../features/automations/automationStore";

interface TriggerServiceState {
  started: boolean;
  agents: NoskaAgent[];
  automations: NoskaAutomation[];
  getContext: (() => { currentPage?: unknown; pages: unknown[]; actions: Record<string, (...args: unknown[]) => unknown> }) | null;
  timer: ReturnType<typeof setInterval> | null;
  notify: ((msg: string) => void) | null;
}

const state: TriggerServiceState = {
  started: false,
  agents: [],
  automations: [],
  getContext: null,
  timer: null,
  notify: null,
};

const SCHEDULE_TICK_MS = 60_000;
let generation = 0;
let unsubscribe: (() => void) | null = null;
let refreshInFlight: Promise<void> | null = null;
let refreshDirty = false;
let definitionsGeneration: number | null = null;
let pollingGeneration: number | null = null;

function isVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

async function pollDefinitions(): Promise<void> {
  if (!state.started || !isVisible() || pollingGeneration === generation) return;
  const currentGeneration = generation;
  pollingGeneration = currentGeneration;
  try {
    await refreshDefinitions();
    while (state.started && generation === currentGeneration && refreshInFlight) await refreshInFlight;
    if (state.started && generation === currentGeneration && definitionsGeneration === currentGeneration && !refreshDirty && isVisible()) evaluateSchedules();
  } finally {
    if (pollingGeneration === currentGeneration) pollingGeneration = null;
  }
}

function handleVisibilityChange(): void {
  if (isVisible()) void pollDefinitions();
}

export function stopTriggerService(): void {
  state.started = false;
  generation++;
  refreshDirty = false;
  definitionsGeneration = null;
  if (state.timer !== null) clearInterval(state.timer);
  state.timer = null;
  unsubscribe?.();
  unsubscribe = null;
  if (typeof document !== "undefined") document.removeEventListener("visibilitychange", handleVisibilityChange);
  state.agents = [];
  state.automations = [];
  state.getContext = null;
  state.notify = null;
  pollingGeneration = null;
}

/** Wire the service to app data. Call after sign-in / pages hydration. */
export function startTriggerService(options: {
  getContext: TriggerServiceState["getContext"];
  onNotify?: (message: string) => void;
}): () => void {
  state.getContext = options.getContext;
  state.notify = options.onNotify || null;

  if (!state.started) {
    state.started = true;
    generation++;
    unsubscribe = subscribeWorkspaceEvents(handleWorkspaceEvent);
    state.timer = setInterval(() => { void pollDefinitions(); }, SCHEDULE_TICK_MS);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", handleVisibilityChange);
    void pollDefinitions();
  }
  const currentGeneration = generation;
  return () => {
    if (generation === currentGeneration) stopTriggerService();
  };
}

export function refreshDefinitions(): Promise<void> {
  if (!state.started) return Promise.resolve();
  refreshDirty = true;
  definitionsGeneration = null;
  if (refreshInFlight) return refreshInFlight;
  if (!isVisible()) return Promise.resolve();
  const request = (async () => {
    while (state.started && isVisible() && refreshDirty) {
      const currentGeneration = generation;
      refreshDirty = false;
      try {
        const [agents, automations] = await Promise.all([fetchAgents(), fetchAutomations()]);
        if (!state.started || generation !== currentGeneration || refreshDirty) continue;
        state.agents = agents;
        state.automations = automations;
        definitionsGeneration = currentGeneration;
      } catch (err) {
        console.warn("[noska-triggers] failed to refresh definitions", err);
      }
    }
  })();
  refreshInFlight = request.finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export function getLoadedDefinitions(): { agents: NoskaAgent[]; automations: NoskaAutomation[] } {
  return { agents: state.agents, automations: state.automations };
}

// ─── Event triggers ────────────────────────────────────────────────────────

function handleWorkspaceEvent(event: WorkspaceEvent): void {
  for (const agent of state.agents) {
    if (agent.status !== "active") continue;
    if (agent.trigger.type !== event.type) continue;
    if (!matchesScope(agent.trigger.scopePageId, event)) continue;
    launchAgent(agent, event);
  }

  for (const automation of state.automations) {
    if (automation.status !== "active") continue;
    const triggerType = automation.trigger.type === "schedule" ? null : automation.trigger.type;
    if (!triggerType || triggerType !== event.type) continue;
    if (!matchesScope(automation.trigger.scopePageId, event)) continue;
    launchAutomation(automation, event);
  }
}

function matchesScope(scopePageId: string | null | undefined, event: WorkspaceEvent): boolean {
  if (!scopePageId) return true;
  return scopePageId === event.pageId;
}

function buildEventVars(event: WorkspaceEvent): Record<string, unknown> {
  return {
    "event.type": event.type,
    "event.pageId": event.pageId,
    "event.pageTitle": event.pageTitle,
    "event.blockText": event.blockText,
    "event.detail": event.detail,
    "event.at": event.at,
  };
}

// ─── Launchers ─────────────────────────────────────────────────────────────

export async function launchAgent(agent: NoskaAgent, event: WorkspaceEvent): Promise<void> {
  if (agentRuntime.isActive(agent.id)) return;
  const blockedReason = agentRuntime.canTrigger(agent.id, event);
  if (blockedReason) {
    console.info(`[noska-triggers] ${agent.name}: ${blockedReason}`);
    return;
  }
  agentRuntime.noteTriggerAccepted(agent.id, event);

  await agentRuntime.execute({
    goal: agent.instructions || agent.name,
    sourceId: agent.id,
    sourceKind: "agent",
    trigger: agent.trigger.type,
    triggerDetail: event.pageTitle || event.detail,
    permissions: agent.permissions,
    memoryMode: agent.memoryMode,
    modelClassOverride: agent.modelClass === "default" ? undefined : agent.modelClass,
    instructions: `You are running as the persistent worker "${agent.name}". ${agent.description ? `Purpose: ${agent.description}.` : ""} Trigger context: ${event.type}${event.pageTitle ? ` on page "${event.pageTitle}"` : ""}.`,
    getContext: () => safeContext(),
    onProgress: () => { /* runs are visible via runStore subscription */ },
  });
}

export async function launchAutomation(automation: NoskaAutomation, event: WorkspaceEvent): Promise<void> {
  if (agentRuntime.isActive(automation.id)) return;
  const blockedReason = agentRuntime.canTrigger(automation.id, event);
  if (blockedReason) {
    console.info(`[noska-triggers] ${automation.name}: ${blockedReason}`);
    return;
  }
  agentRuntime.noteTriggerAccepted(automation.id, event);

  await executeAutomation(automation, event);
}

/**
 * Execute an automation's deterministic steps through the runtime.
 * Steps referencing {{variables}} resolve from prior step outputs and the
 * triggering event — safely, with no code execution.
 */
export async function executeAutomation(automation: NoskaAutomation, event: WorkspaceEvent): Promise<void> {
  const instructions = [
    `You are executing the automation "${automation.name}".`,
    automation.description ? `What it does: ${automation.description}` : "",
    `Perform each of these steps in order using your tools:`,
    ...automation.steps.map((s, i) => `${i + 1}. ${s.label}${s.instruction ? ` — ${s.instruction}` : s.toolName ? ` (use ${s.toolName})` : ""}`),
  ].filter(Boolean).join("\n");

  const run = await agentRuntime.execute({
    goal: automation.description || automation.name,
    sourceId: automation.id,
    sourceKind: "automation",
    trigger: event.type,
    triggerDetail: automation.name,
    permissions: automation.permissions,
    instructions,
    getContext: () => safeContext(),
    maxSteps: Math.max(automation.steps.length + 2, 4),
  });

  await noteAutomationRan(automation.id);

  if (run.status === "completed") {
    // Persist lastRunAt for schedule due-ness tracking
    const refreshed = { ...automation, lastRunAt: new Date().toISOString(), runCount: (automation.runCount || 0) + 1 };
    await saveAutomation(refreshed);
  }
}

/**
 * Manual "Run now" from the Automations UI — bypasses event matching but
 * still passes through loop protection's rate caps.
 */
export async function launchAutomationManually(automation: NoskaAutomation): Promise<void> {
  if (agentRuntime.isActive(automation.id)) return;
  const blocked = agentRuntime.noteManualRun(automation.id);
  if (blocked) {
    console.info(`[noska-triggers] ${automation.name}: ${blocked}`);
    return;
  }
  await executeAutomation(automation, { type: "manual", at: new Date().toISOString(), detail: "Manual run" });
}

function safeContext(): { currentPage?: unknown; pages: unknown[]; actions: Record<string, (...args: unknown[]) => unknown> } {
  try {
    return state.getContext?.() || { pages: [], actions: {} };
  } catch {
    return { pages: [], actions: {} };
  }
}

// ─── Schedule evaluation ───────────────────────────────────────────────────

function evaluateSchedules(): void {
  const now = new Date();
  const syntheticEvent: WorkspaceEvent = { type: "schedule", at: now.toISOString(), detail: "scheduled run" };

  for (const agent of state.agents) {
    if (agent.status !== "active" || agent.trigger.type !== "schedule" || !agent.trigger.schedule) continue;
    const lastRun = latestRunFor(agent.id);
    if (isScheduleDue(agent.trigger.schedule, now, lastRun)) {
      launchAgent(agent, syntheticEvent);
    }
  }

  for (const automation of state.automations) {
    if (automation.status !== "active" || automation.trigger.type !== "schedule" || !automation.trigger.schedule) continue;
    const lastRun = automation.lastRunAt || latestRunFor(automation.id);
    if (isScheduleDue(automation.trigger.schedule, now, lastRun)) {
      launchAutomation(automation, syntheticEvent);
    }
  }
}

function latestRunFor(sourceId: string): string | null {
  // Imported lazily by callers through runStore mirror reads kept cheap here.
  try {
    const raw = localStorage.getItem("noska_intelligence_runs");
    if (!raw) return null;
    const runs = JSON.parse(raw) as Array<{ sourceId: string; startedAt: string }>;
    const relevant = runs.filter((r) => r.sourceId === sourceId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return relevant[0]?.startedAt || null;
  } catch {
    return null;
  }
}
