/**
 * Noska Intelligence — Proposal Generator
 *
 * When Noska AI detects an automation_intent or agent_intent request, it
 * compiles a concrete proposal the user reviews before anything is created.
 * Nothing is ever silently activated (mandatory product rule).
 *
 * Proposals are built deterministically from the request; when an AI
 * provider is configured the description/instructions are polished by the
 * model, but every structural field has a safe fallback so proposals work
 * even offline.
 */

import { aiManager } from "../AIManager";
import { parseSchedule, describeSchedule } from "./scheduler";
import { uid } from "../../utils/blockModel";
import type { ConditionGroup, PermissionSpec, TriggerSpec } from "./types";
import { defaultPermissions } from "./types";

export interface AutomationProposal {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger: TriggerSpec;
  conditions?: ConditionGroup | null;
  actions: Array<{ label: string; kind: "ai_step" | "tool"; instruction?: string; toolName?: string; toolParams?: Record<string, unknown> }>;
  permissions: PermissionSpec;
}

export interface AgentProposal {
  id: string;
  name: string;
  description: string;
  icon: string;
  instructions: string;
  trigger: TriggerSpec;
  contextScope: string[];
  permissions: PermissionSpec;
}

// ─── Trigger extraction ─────────────────────────────────────────────────────

const EVENT_PATTERNS: Array<{ type: TriggerSpec["type"]; re: RegExp }> = [
  { type: "task_completed", re: /\b(task|todo|item)s?\s+(becomes?|is|are|turns?|marked)\s*(completed|done|finished)\b/i },
  { type: "task_completed", re: /\bwhen\s+(a\s+)?task\s+is\s+completed\b/i },
  { type: "page_created", re: /\b(when|whenever)\s+(a\s+)?(new\s+)?page\s+is\s+created\b/i },
  { type: "page_created", re: /\b(when|whenever)\s+i?\s*create\s+(a\s+)?(new\s+)?page\b/i },
  { type: "page_updated", re: /\b(when|whenever)\s+(a\s+)?page\s+is\s+(updated|edited|changed)\b/i },
  { type: "title_changed", re: /\b(when|whenever)\s+(the\s+)?(title|name)\s+changes?\b/i },
  { type: "page_trashed", re: /\b(when|whenever)\s+(a\s+)?page\s+is\s+(deleted|trashed)\b/i },
];

function extractTrigger(text: string): TriggerSpec {
  const scheduleTextMatch = text.match(/\bevery[^,.;]{0,60}|\bdaily[^,.;]{0,40}|\bweekly[^,.;]{0,40}|\bmonthly[^,.;]{0,40}/i);
  if (scheduleTextMatch) {
    const schedule = parseSchedule(scheduleTextMatch[0]);
    if (schedule) return { type: "schedule", schedule };
  }
  for (const { type, re } of EVENT_PATTERNS) {
    if (re.test(text)) return { type };
  }
  return { type: "manual" };
}

export function describeTrigger(trigger: TriggerSpec): string {
  switch (trigger.type) {
    case "schedule": return describeSchedule(trigger.schedule!);
    case "task_completed": return "When a task is completed";
    case "page_created": return "When a page is created";
    case "page_updated": return "When a page is updated";
    case "title_changed": return "When a title changes";
    case "page_trashed": return "When a page is trashed";
    default: return "Manual runs only";
  }
}

// ─── Action extraction ──────────────────────────────────────────────────────

interface ActionSeed {
  re: RegExp;
  action: AutomationProposal["actions"][number];
}

const ACTION_SEEDS: ActionSeed[] = [
  {
    re: /\bsummar(y|ize|ise)\b/i,
    action: { label: "Summarize the content", kind: "ai_step", instruction: "Write a concise summary of the task/page content." },
  },
  {
    re: /\b(update|add.*to|append.*to)\s+(the\s+)?project(\s+page)?\b/i,
    action: { label: "Update the project page", kind: "ai_step", instruction: "Append the result to the related project page using append_blocks." },
  },
  {
    re: /\bprioriti[sz]e\b/i,
    action: { label: "Prioritize tasks", kind: "ai_step", instruction: "Review open todos across pages and reorder/prioritize them by urgency using update tools." },
  },
  {
    re: /\b(daily\s+)?plan\b/i,
    action: { label: "Create the plan page", kind: "ai_step", instruction: "Create a prioritized daily plan page using create_page with today's date as title suffix." },
  },
  {
    re: /\bnotify|remind\b/i,
    action: { label: "Prepare notification", kind: "ai_step", instruction: "Draft a short notification message describing what changed and why it matters." },
  },
  {
    re: /\breport\b/i,
    action: { label: "Generate report", kind: "ai_step", instruction: "Compile a structured report of progress, blockers, and next steps." },
  },
];

function extractActions(text: string, fallbackGoal: string): AutomationProposal["actions"] {
  const actions: AutomationProposal["actions"] = [];
  for (const seed of ACTION_SEEDS) {
    if (seed.re.test(text)) actions.push(seed.action);
  }
  if (actions.length === 0) {
    actions.push({
      label: "Do the requested work",
      kind: "ai_step",
      instruction: `Perform this recurring task:\n${fallbackGoal}`,
    });
  }
  return actions;
}

// ─── Naming ────────────────────────────────────────────────────────────────

function deriveName(text: string, fallback: string): string {
  const quoted = text.match(/"([^"]{3,40})"/);
  if (quoted) return quoted[1];
  const named = text.match(/\b(?:called|named)\s+([A-Za-z][A-Za-z0-9 ]{2,30})/i);
  if (named) return named[1].trim();
  return fallback;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function proposeAutomation(goal: string): Promise<AutomationProposal> {
  const trigger = extractTrigger(goal);
  const actions = extractActions(goal, goal);
  const proposal: AutomationProposal = {
    id: `auto_${uid()}`,
    name: deriveName(goal, guessAutomationName(trigger, actions)),
    description: firstSentence(cleanGoal(goal)),
    icon: "⚡",
    trigger,
    conditions: undefined,
    actions,
    permissions: { ...defaultPermissions(), delete: "approval", agents: "disabled", automations: "disabled" },
  };
  await polishText(proposal);
  return proposal;
}

export async function proposeAgent(goal: string): Promise<AgentProposal> {
  const trigger = extractTrigger(goal);
  const wantsTasks = /\btasks?|todos?|priorit/i.test(goal);
  const wantsProjects = /\bprojects?\b/i.test(goal);
  const proposal: AgentProposal = {
    id: `agent_${uid()}`,
    name: deriveName(goal, guessAgentName(goal)),
    description: firstSentence(cleanGoal(goal)),
    icon: guessIcon(goal),
    instructions: buildDefaultInstructions(goal),
    trigger,
    contextScope: [
      ...(wantsTasks || !goal ? ["Tasks"] : []),
      ...(wantsProjects ? ["Projects"] : []),
      "Recent pages",
    ],
    permissions: {
      ...defaultPermissions(),
      create: "approval",
      delete: "approval",
      agents: "disabled",
      automations: "disabled",
    },
  };
  await polishInstructions(proposal);
  return proposal;
}

function cleanGoal(goal: string): string {
  return goal.replace(/^(please\s+)/i, "").trim();
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]{5,140}[.!?]?/);
  const s = m ? m[0] : text.slice(0, 140);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function guessAutomationName(trigger: TriggerSpec, actions: AutomationProposal["actions"]): string {
  const verb = actions[0]?.label.split(" ").slice(0, 3).join(" ") || "Workflow";
  const when = trigger.type === "schedule" ? "Scheduled" : "Event";
  return `${verb} (${when})`.replace(/^\w/, (c) => c.toUpperCase());
}

function guessAgentName(goal: string): string {
  if (/planner|plan/i.test(goal)) return "Daily Planner";
  if (/triage|bug/i.test(goal)) return "Bug Triage";
  if (/report/i.test(goal)) return "Weekly Reporter";
  if (/crm|lead|contact/i.test(goal)) return "CRM Assistant";
  if (/study|learn/i.test(goal)) return "Study Coach";
  if (/meeting/i.test(goal)) return "Meeting Assistant";
  if (/content|blog|social/i.test(goal)) return "Content Planner";
  if (/research/i.test(goal)) return "Research Assistant";
  if (/organiz/i.test(goal)) return "Knowledge Organizer";
  if (/project/i.test(goal)) return "Project Manager";
  return "Custom Agent";
}

function guessIcon(goal: string): string {
  if (/plan|daily/i.test(goal)) return "📅";
  if (/triage|bug/i.test(goal)) return "🐞";
  if (/report/i.test(goal)) return "📊";
  if (/research/i.test(goal)) return "🔍";
  if (/study/i.test(goal)) return "🎓";
  if (/meeting/i.test(goal)) return "🎙️";
  if (/content|blog/i.test(goal)) return "✍️";
  if (/crm|sales/i.test(goal)) return "🤝";
  if (/clean|organi/i.test(goal)) return "🧹";
  return "🤖";
}

function buildDefaultInstructions(goal: string): string {
  return `You are a persistent workspace worker. Your goal: ${cleanGoal(goal)}\n\nOn each run:\n1. Gather the relevant data with read tools first.\n2. Do the work described above with create/update tools.\n3. Verify your changes.\n4. Produce a short report of what you did and why.`;
}

/** Best-effort polish via the configured model; falls back silently. */
async function polishText(proposal: AutomationProposal): Promise<void> {
  if (!aiManager.isConfigured()) return;
  try {
    const result = await aiManager.sendRaw({
      system: "You write concise product copy. Reply ONLY with minified JSON: {\"name\":\"...\",\"description\":\"...\"}. Name: max 4 words, Title Case. Description: one clear sentence.",
      messages: [{ role: "user", content: `User request: ${proposal.description}\nTrigger: ${describeTrigger(proposal.trigger)}\nActions: ${proposal.actions.map((a) => a.label).join("; ")}` }],
      maxTokens: 200,
    });
    const match = result.match(/\{[\s\S]*\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { name?: string; description?: string };
    if (parsed.name && typeof parsed.name === "string") proposal.name = parsed.name.slice(0, 48);
    if (parsed.description && typeof parsed.description === "string") proposal.description = parsed.description.slice(0, 160);
  } catch { /* keep deterministic defaults */ }
}

async function polishInstructions(proposal: AgentProposal): Promise<void> {
  if (!aiManager.isConfigured()) return;
  try {
    const result = await aiManager.sendRaw({
      system: "You write operating instructions for persistent workspace AI workers. Reply ONLY with minified JSON: {\"instructions\":\"...\"}. Instructions: 3-6 numbered sentences covering what to gather, do, verify, and report.",
      messages: [{ role: "user", content: `Agent purpose: ${proposal.description}\nOriginal request: ${proposal.instructions}` }],
      maxTokens: 350,
    });
    const match = result.match(/\{[\s\S]*\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { instructions?: string };
    if (parsed.instructions && typeof parsed.instructions === "string") {
      proposal.instructions = parsed.instructions.slice(0, 1200);
    }
  } catch { /* keep deterministic defaults */ }
}
