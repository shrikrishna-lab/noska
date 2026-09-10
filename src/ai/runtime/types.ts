/**
 * Noska Intelligence — Shared Runtime Types
 *
 * The single type vocabulary used by Noska AI (interactive), Custom Agents
 * (persistent workers) and Automations (event/schedule workflows). All three
 * layers compile down to the same `RuntimeJob` and execute through the same
 * AgentRuntime pipeline: plan → context → tools → execute → verify → report.
 */

// ─── Intent ─────────────────────────────────────────────────────────────────

export type RuntimeIntent =
  | "question"
  | "search"
  | "create"
  | "edit"
  | "analyze"
  | "organize"
  | "plan"
  | "action"
  | "automation_intent"
  | "agent_intent";

export interface IntentResult {
  intent: RuntimeIntent;
  /** true when the request needs more than a single model turn */
  multiStep: boolean;
  /** short human explanation shown in the progress UI */
  rationale: string;
}

// ─── Permissions ────────────────────────────────────────────────────────────

/** Permission categories map tool names onto coarse capability buckets. */
export type PermissionCategory =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "memory"
  | "agents"
  | "automations"
  | "external";

/** 🟢 auto — run silently · 🟡 approval — ask first · 🔴 disabled — never */
export type PermissionMode = "auto" | "approval" | "disabled";

export interface PermissionSpec {
  read: PermissionMode;
  create: PermissionMode;
  update: PermissionMode;
  delete: PermissionMode;
  memory: PermissionMode;
  agents: PermissionMode;
  automations: PermissionMode;
  /** External side effects (notifications now; email/calendar/Slack later) */
  external: PermissionMode;
}

export const FULL_AUTO_PERMISSIONS: PermissionSpec = {
  read: "auto",
  create: "auto",
  update: "auto",
  delete: "approval",
  memory: "auto",
  agents: "approval",
  automations: "approval",
  external: "approval",
};

export const READ_ONLY_PERMISSIONS: PermissionSpec = {
  read: "auto",
  create: "disabled",
  update: "disabled",
  delete: "disabled",
  memory: "disabled",
  agents: "disabled",
  automations: "disabled",
  external: "disabled",
};

export function defaultPermissions(): PermissionSpec {
  return { ...FULL_AUTO_PERMISSIONS };
}

// ─── Triggers ───────────────────────────────────────────────────────────────

export type TriggerType =
  | "manual"
  | "schedule"
  | "page_created"
  | "page_updated"
  | "task_completed"
  | "title_changed"
  | "page_trashed";

export interface ScheduleSpec {
  /** every_day | every_weekday | weekly | monthly | interval */
  kind: "every_day" | "every_weekday" | "weekly" | "monthly" | "interval";
  /** 0-23 for daily/weekly/monthly kinds */
  hour?: number;
  minute?: number;
  /** 0=Sunday..6=Saturday, for weekly */
  dayOfWeek?: number;
  /** 1-28, for monthly */
  dayOfMonth?: number;
  /** minutes, for interval kind */
  intervalMinutes?: number;
}

export interface TriggerSpec {
  type: TriggerType;
  /** for page_* triggers: restrict to a subtree/page id (optional) */
  scopePageId?: string | null;
  schedule?: ScheduleSpec | null;
}

// ─── Steps & Plans ──────────────────────────────────────────────────────────

export type StepKind =
  | "answer" // single model turn, no tools required
  | "ai_step" // model turn with tools available
  | "tool" // direct deterministic tool call
  | "condition" // evaluate conditions gate
  | "approval"; // pause for human approval

export interface PlanStep {
  id: string;
  kind: StepKind;
  /** short imperative label shown in the progress UI */
  label: string;
  /** prompt/instruction for ai_step / answer steps */
  instruction?: string;
  /** for tool steps */
  toolName?: string;
  toolParams?: Record<string, unknown>;
  /** for condition steps */
  condition?: ConditionGroup;
}

export interface ExecutionPlan {
  goal: string;
  intent: RuntimeIntent;
  steps: PlanStep[];
  /** high-level summary of the approach (explainability without CoT) */
  approach: string;
}

// ─── Conditions (automations) ───────────────────────────────────────────────

export interface Condition {
  field: string; // e.g. "page.title", "todo.text", "event.type", "ai.classification"
  op:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt"
    | "is_empty"
    | "not_empty";
  value?: string;
}

export interface ConditionGroup {
  op: "and" | "or";
  conditions: Condition[];
}

// ─── Progress & Runs ────────────────────────────────────────────────────────

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped" | "awaiting_approval";

export interface StepProgress {
  stepId: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface ApprovalRequest {
  id: string;
  executionId: string;
  category: PermissionCategory;
  action: string;
  reason: string;
  params?: Record<string, unknown>;
  resolvedAt?: string;
  approved?: boolean;
}

export interface ToolCallRecord {
  name: string;
  ok: boolean;
  error?: string;
  resultSummary?: string;
  verified?: boolean;
}

export interface AffectedResource {
  type: "page" | "block" | "database" | "record" | "agent" | "automation";
  id: string;
  title?: string;
  change: string;
}

export interface RunRecord {
  id: string;
  /** agent id, automation id, or "noska-ai" for interactive sessions */
  sourceId: string;
  sourceKind: "ai" | "agent" | "automation";
  trigger: TriggerType;
  triggerDetail?: string;
  status: "running" | "completed" | "failed" | "awaiting_approval" | "rejected" | "interrupted"
    | "queued" | "waiting_retry" | "skipped" | "timed_out";
  startedAt: string;
  finishedAt?: string;
  steps: StepProgress[];
  toolCalls: ToolCallRecord[];
  affectedResources: AffectedResource[];
  approvals: ApprovalRequest[];
  errors: string[];
  summary?: string;
  tokensUsed?: number;
  creditsUsed?: number;
  modelClass?: ModelClass;
  /** Durable-run enrichment */
  attempt?: number;
  parentRunId?: string;
  durationMs?: number;
  counts?: { modelCalls: number; toolCalls: number; delegations: number; memoryWrites: number };
}

export type RunListener = (run: RunRecord) => void;

// ─── Jobs ───────────────────────────────────────────────────────────────────

/** Loose structural view of App.tsx's toolContext — the runtime never needs
 * Page's full type; strict:false codebase style keeps this `any`-shaped. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ToolContextLike {
  currentPage?: any;
  pages: any[];
  actions: Record<string, (...args: unknown[]) => unknown>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface RuntimeJobOptions {
  goal: string;
  sourceId: string;
  sourceKind: RunRecord["sourceKind"];
  trigger: TriggerType;
  triggerDetail?: string;
  permissions?: PermissionSpec;
  modelClassOverride?: ModelClass;
  maxSteps?: number;
  /** Agent memory scope: "off" = never recall/write · "run" = recall only ·
   * "persistent" = recall + write run summaries between runs. Undefined is
   * treated as "run" for backward compatibility. */
  memoryMode?: "off" | "run" | "persistent";
  /** extra system-level instructions merged into every model call */
  instructions?: string;
  /** context pages to seed retrieval (workspace snapshot provider) */
  getContext?: () => ToolContextLike;
  onProgress?: (steps: StepProgress[], run: RunRecord) => void;
}

// ─── Model classes ──────────────────────────────────────────────────────────

export type ModelClass = "fast" | "default" | "reasoning";

// ─── Workspace events (trigger bus) ─────────────────────────────────────────

export interface WorkspaceEvent {
  type: TriggerType;
  pageId?: string;
  pageTitle?: string;
  blockId?: string;
  blockText?: string;
  detail?: string;
  at: string;
  provenance?: { executionId: string; sourceId: string };
}
