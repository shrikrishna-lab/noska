/**
 * Noska Intelligence — Agent Runtime (the shared execution engine)
 *
 * ONE pipeline powering all three intelligence layers:
 *
 *   Noska AI ────────┐
 *   Custom Agents ───┼──→ AgentRuntime.execute() ──→ plan → context → tools
 *   Automations ─────┘         (permissions → verification → reporting)
 *
 * Execution loop per job:
 *   understand → build plan → for each step: gather context / call model /
 *   gate tools through permissions / execute with provenance stamping /
 *   verify mutations / recover or report honestly.
 *
 * Never exposes chain-of-thought; emits only concise progress + outcomes.
 */

import { aiManager, buildReasoningDirective } from "../AIManager";
import { getAgent } from "../agents";
import { getToolInstructions, getToolSchemas, parseToolCalls, stripToolCalls, runTool } from "../tools";
import { buildContext } from "../ContextBuilder";
import { uid, now } from "../../utils/blockModel";
import { classifyIntent, classifyIntentSmart, isAgenticIntent } from "./intent";
import { buildPlan } from "./planner";
import { evaluatePermission } from "./permissions";
import { requestApproval, requestClarification } from "./approvals";
import { verifyToolCall, collectAffectedResources } from "./verifier";
import { selectModel, classifyModelNeed } from "./modelRouter";
import { recallContext as recallAgentMemory, rememberFact } from "./agentMemory";
import { loopProtector } from "./loopProtection";
import { upsertRun, persistRunRemote, recordRunEvent } from "./runStore";
import { RESOURCE_LIMITS, redact } from "./serverContract";
import type { RunEventType } from "./serverContract";
import type {
  ConditionGroup,
  ModelClass,
  PlanStep,
  RunRecord,
  RuntimeJobOptions,
  StepProgress,
  ToolCallRecord,
  ToolContextLike,
} from "./types";

const EXEC_PROVENANCE_KEY = "__noskaExec";
/** Model rounds available per plan step. Each round can issue tool calls and
 * see the results of its own previous rounds, so 5 gives complex steps room
 * to search → read → act → verify within a single step. */
const MAX_MODEL_ROUNDS_PER_STEP = 5;
/** Multi-agent guard: an agent may delegate to another agent, but chains
 * cannot nest deeper than this (A→B→C is the practical ceiling). */
const MAX_DELEGATION_DEPTH = 1;
/** Conversation history injected into interactive runs: last N turns, each
 * truncated, so follow-ups like "add a todo to that page" resolve correctly
 * without ballooning the context. */
const HISTORY_TURNS = 8;
const HISTORY_MESSAGE_CAP = 1600;

interface WorkspaceSnapshot {
  pages: Array<{ id: string; blocks?: Array<Record<string, unknown>> }>;
}

export interface ExecutionContext {
  run: RunRecord;
  vars: Record<string, unknown>;
  abort: { aborted: boolean };
  /** Observability trace — durable via runStore, surfaced live by the UI. */
  events: Array<{ seq: number; type: RunEventType; step?: string; detail?: string; at: number; durationMs?: number }>;
  /** Reasoning effort applied to every model call in this run. */
  effort: "low" | "medium" | "high";
  /** Token/cost accounting across this run's model calls. */
  usage: {
    modelRequests: number;
    promptTokens: number;
    completionTokens: number;
    providerReported: boolean;
  };
}

/** Per-model-call usage collector: providers may fire usage events more than
 * once per call (e.g. Anthropic message_start + message_delta) — take the
 * max per field within the call, then settle() sums it into the run. */
function usageSink(context: ExecutionContext) {
  let promptTokens = 0;
  let completionTokens = 0;
  return {
    onUsage: (u: { promptTokens?: number; completionTokens?: number }) => {
      if (u.promptTokens != null) promptTokens = Math.max(promptTokens, u.promptTokens);
      if (u.completionTokens != null) completionTokens = Math.max(completionTokens, u.completionTokens);
    },
    settle: () => {
      context.usage.modelRequests += 1;
      context.usage.promptTokens += promptTokens;
      context.usage.completionTokens += completionTokens;
      if (promptTokens > 0 || completionTokens > 0) context.usage.providerReported = true;
    },
  };
}

function emptyRun(options: RuntimeJobOptions): RunRecord {
  return {
    id: `run_${uid()}`,
    sourceId: options.sourceId,
    sourceKind: options.sourceKind,
    trigger: options.trigger,
    triggerDetail: options.triggerDetail,
    status: "running",
    startedAt: now(),
    steps: [],
    toolCalls: [],
    affectedResources: [],
    approvals: [],
    errors: [],
  };
}

/**
 * Wrap the app's mutating tool-context actions so every runtime-caused
 * patch carries execution provenance. The App publishes workspace events
 * from updatePage and forwards this marker into event provenance, which is
 * how automation loops are broken at the root.
 */
function stampActions(actions: Record<string, (...args: unknown[]) => unknown>, run: RunRecord): Record<string, (...args: unknown[]) => unknown> {
  const stamped: Record<string, (...args: unknown[]) => unknown> = {};
  const provenance = { executionId: run.id, sourceId: run.sourceId };
  for (const [name, fn] of Object.entries(actions)) {
    stamped[name] = (...args: unknown[]) => {
      // For page-mutation actions whose last arg is a patch object,
      // attach provenance. createPage(title, icon, content, tags) has no
      // patch arg — provenance for creations flows through lineage instead.
      const lastArg = args[args.length - 1];
      if ((name === "updateAnyPage" || name === "renamePage") && lastArg && typeof lastArg === "object" && !Array.isArray(lastArg)) {
        args[args.length - 1] = { ...(lastArg as Record<string, unknown>), [EXEC_PROVENANCE_KEY]: provenance };
      }
      return fn(...args);
    };
  }
  return stamped;
}

function snapshotWorkspace(getContext: (() => ToolContextLike) | undefined): WorkspaceSnapshot {
  try {
    const ctx = getContext?.();
    return { pages: (ctx?.pages || []) as WorkspaceSnapshot["pages"] };
  } catch {
    return { pages: [] };
  }
}

export class AgentRuntime {
  private activeRuns = new Map<string, ExecutionContext>();
  private delegationDepth = 0;

  /** Is a given source currently executing? */
  isActive(sourceId: string): boolean {
    for (const ctx of this.activeRuns.values()) {
      if (ctx.run.sourceId === sourceId) return true;
    }
    return false;
  }

  abort(runId: string): void {
    const ctx = this.activeRuns.get(runId);
    if (ctx) ctx.abort.aborted = true;
  }

  /**
   * Evaluate an automation condition group against current vars.
   * Exported for the trigger service to pre-filter automations.
   */
  evaluateConditions(group: ConditionGroup | undefined | null, vars: Record<string, unknown>): boolean {
    if (!group || !group.conditions || group.conditions.length === 0) return true;
    const results = group.conditions.map((c) => this.evaluateCondition(c.field, c.op, c.value, vars));
    return group.op === "or" ? results.some(Boolean) : results.every(Boolean);
  }

  private lookupVar(vars: Record<string, unknown>, path: string): string {
    if (Object.prototype.hasOwnProperty.call(vars, path)) {
      const v = vars[path];
      return v == null ? "" : String(v);
    }
    let cur: unknown = vars;
    for (const part of path.split(".")) {
      if (cur == null || typeof cur !== "object") return "";
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur == null ? "" : String(cur);
  }

  private evaluateCondition(field: string, op: string, value: string | undefined, vars: Record<string, unknown>): boolean {
    const actual = this.lookupVar(vars, field).toLowerCase();
    const expected = String(value ?? "").toLowerCase();
    switch (op) {
      case "equals": return actual === expected;
      case "not_equals": return actual !== expected;
      case "contains": return actual.includes(expected) && expected !== "";
      case "starts_with": return expected !== "" && actual.startsWith(expected);
      case "ends_with": return expected !== "" && actual.endsWith(expected);
      case "gt": return parseFloat(actual) > parseFloat(expected);
      case "lt": return parseFloat(actual) < parseFloat(expected);
      case "is_empty": return actual.trim() === "";
      case "not_empty": return actual.trim() !== "";
      default: return false;
    }
  }

  /**
   * Execute a job through the full pipeline. Resolves with the final
   * RunRecord; never throws (failures are recorded on the run).
   */
  async execute(goalOrOptions: string | RuntimeJobOptions, maybeOptions?: Partial<RuntimeJobOptions>): Promise<RunRecord> {
    const options: RuntimeJobOptions =
      typeof goalOrOptions === "string"
        ? ({ goal: goalOrOptions, sourceId: "noska-ai", sourceKind: "ai", trigger: "manual", ...maybeOptions } as RuntimeJobOptions)
        : goalOrOptions;

    const run = emptyRun(options);
    const abort = { aborted: false };
    const context: ExecutionContext = { run, vars: {}, abort, events: [], effort: "medium", usage: { modelRequests: 0, promptTokens: 0, completionTokens: 0, providerReported: false } };
    this.activeRuns.set(run.id, context);

    /** Record an observability event (in-memory trace + durable write). */
    const track = (type: RunEventType, detail?: string, step?: string, durationMs?: number) => {
      const evt = { seq: context.events.length + 1, type, step, detail, at: Date.now(), durationMs };
      context.events.push(evt);
      void recordRunEvent({
        runId: run.id,
        seq: evt.seq,
        type,
        step,
        durationMs,
        metadata: detail ? { detail } : undefined,
      });
    };

    const emit = () => {
      upsertRun({ ...run });
      options.onProgress?.([...run.steps], { ...run });
    };

    try {
      track("RUN_STARTED", options.goal.slice(0, 200));

      // ── Understand ────────────────────────────────────────────────────
      const intentStart = Date.now();
      // Interactive AI requests get the LLM intent-refinement fallback for
      // ambiguous multi-step asks; background workers don't need it (their
      // instructions already force an agentic plan).
      const intentResult = options.sourceKind === "ai"
        ? await classifyIntentSmart(options.goal)
        : classifyIntent(options.goal);
      // Planning/analysis work earns a deeper reasoning protocol.
      context.effort = ["plan", "analyze", "organize"].includes(intentResult.intent) ? "high" : "medium";
      run.steps.push({
        stepId: "understand",
        label: intentResult.intent === "question" ? "Understanding request" : `Understood: ${intentResult.rationale.toLowerCase()}`,
        status: "done",
      });
      track("CONTEXT_LOADED", intentResult.rationale, "understand", Date.now() - intentStart);
      emit();

      // ── Plan ─────────────────────────────────────────────────────────
      const agentic = options.sourceKind !== "ai" || isAgenticIntent(intentResult.intent) || !!options.instructions;
      const modelClass: ModelClass = options.modelClassOverride ||
        classifyModelNeed(intentResult.intent === "plan" || intentResult.intent === "analyze" || intentResult.intent === "organize" ? "planning" : "tool_use");
      run.modelClass = modelClass;

      let plan;
      if (agentic) {
        // Background workers (agents/automations) always need tool-capable
        // steps even when their goal reads like a description/question —
        // their `instructions` carry the actual operating procedure.
        const planIntent =
          options.sourceKind !== "ai" && !isAgenticIntent(intentResult.intent)
            ? { ...intentResult, intent: "action" as const }
            : intentResult;
        plan = buildPlan(options.goal, planIntent, options);
        run.steps.push({ stepId: "plan", label: "Planned approach", status: "done", detail: plan.approach });
      } else {
        plan = { goal: options.goal, intent: intentResult.intent, steps: [], approach: "Direct answer." };
      }
      emit();

      // ── Execute steps ────────────────────────────────────────────────
      let finalText = "";
      for (const step of plan.steps) {
        if (abort.aborted) {
          run.status = "interrupted";
          track("RUN_CANCELLED", "Aborted by user");
          break;
        }
        const stepStart = Date.now();
        const progress: StepProgress = { stepId: step.id, label: step.label, status: "running" };
        run.steps.push(progress);
        emit();
        try {
          const result = await this.runStep(step, options, context, emit, track);
          progress.status = result.ok ? "done" : "failed";
          if (result.detail) progress.detail = result.detail;
          if (result.isText && result.text) finalText = result.text;
          track(result.ok ? "TOOL_COMPLETED" : "TOOL_FAILED", `${step.label}: ${result.detail || "ok"}`, step.label, Date.now() - stepStart);
          if (!result.ok) {
            // Failed steps must surface in the run record — a run whose steps
            // failed is not "completed" even when later steps succeed.
            run.errors.push(`${step.label}: ${result.detail || "step failed"}`);
            if (result.fatal) break;
          }
        } catch (err) {
          progress.status = "failed";
          progress.detail = err instanceof Error ? err.message : "Step failed";
          run.errors.push(progress.detail!);
          track("RUN_FAILED", progress.detail, step.label, Date.now() - stepStart);
          break;
        }
        emit();
      }

      // ── Report ───────────────────────────────────────────────────────
      if (run.status === "running") {
        run.status = run.errors.length > 0 ? "failed" : "completed";
      }
      run.finishedAt = now();
      run.durationMs = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
      run.summary = this.buildSummary(run, finalText);
      // Persistent agents write their run outcome into their own memory so
      // the next run recalls what happened before (Notion-style continuity).
      if (options.sourceKind === "agent" && options.memoryMode === "persistent" && run.status === "completed" && run.summary) {
        try {
          rememberFact(options.sourceId, `run ${run.startedAt}`, run.summary, { category: "execution", importance: 0.55 });
          rememberFact(options.sourceId, "last run", `${run.startedAt} — ${run.summary}`.slice(0, 500), { category: "state", importance: 0.9 });
        } catch { /* memory write is best-effort */ }
      }
      track(run.status === "failed" ? "RUN_FAILED" : "RUN_COMPLETED",
        run.summary.slice(0, 200), undefined, run.durationMs);
      emit();
      void persistRunRemote({ ...run });
      return { ...run };
    } finally {
      this.activeRuns.delete(run.id);
    }
  }

  private buildSummary(run: RunRecord, finalText: string): string {
    const changed = run.affectedResources.length;
    const parts: string[] = [];
    if (changed > 0) parts.push(`${changed} change${changed !== 1 ? "s" : ""}`);
    if (run.toolCalls.length > 0) parts.push(`${run.toolCalls.length} tool call${run.toolCalls.length !== 1 ? "s" : ""}`);
    if (finalText) return finalText.length > 400 ? `${finalText.slice(0, 397)}…` : finalText;
    if (parts.length === 0) return run.status === "completed" ? "Completed." : run.status.replace("_", " ");
    return `${run.status === "completed" ? "Done" : "Finished"} — ${parts.join(", ")}.`;
  }

  // ─── Step dispatch ───────────────────────────────────────────────────

  private async runStep(
    step: PlanStep,
    options: RuntimeJobOptions,
    context: ExecutionContext,
    emit: () => void,
    track: (type: RunEventType, detail?: string, step?: string, durationMs?: number) => void
  ): Promise<{ ok: boolean; detail?: string; text?: string; isText?: boolean; fatal?: boolean }> {
    switch (step.kind) {
      case "answer":
        return this.runAnswerStep(step, options, context);
      case "ai_step":
        return this.runAiStep(step, options, context, emit, track);
      case "tool":
        return this.runDirectToolStep(step, options, context);
      case "condition":
        return { ok: this.evaluateConditions(step.condition || null, context.vars), detail: "condition evaluated" };
      case "approval":
        return this.runApprovalGate(step, options, context);
      default:
        return { ok: false, detail: `Unknown step kind "${step.kind}"`, fatal: true };
    }
  }

  private buildSystemPrompt(options: RuntimeJobOptions, allowTools: boolean, effort?: "low" | "medium" | "high"): string {
    const agent = getAgent("assistant");
    let system = agent.system;
    if (options.instructions) {
      system += `\n\n## Additional Instructions\n${options.instructions}`;
    }
    if (allowTools && options.sourceKind === "agent") {
      system += `\n\n## Delegation (multi-agent)\nYou may invoke another persisted agent as a specialist:\n<<TOOL:run_agent>>{"agent_name":"Weekly Reporter","instruction":"compile this week's numbers"}<</TOOL>>\nThe delegate runs with its own permissions. Use it only when a named specialist is genuinely needed — approval may be required.`;
    }
    if (allowTools) system += `\n\n${getToolInstructions({ compact: true })}`;
    // Same reasoning protocol the chat path applies — agentic steps get the
    // effort chosen for this run (high for plan/analyze/organize work).
    system += buildReasoningDirective(effort || "medium");
    return system;
  }

  private buildUserPrompt(instruction: string, options: RuntimeJobOptions): string {
    const sections: string[] = [];
    // The agent must know "today" to act on relative time ("remind me
    // tomorrow at 9", "this week's tasks").
    sections.push(`---\n\n## Now\n${new Date().toString()}`);
    // Memory is honored per agent: "off" = none, "run"/undefined = recall only,
    // "persistent" = recall here + run summaries are written after completion.
    if (options.sourceKind === "agent" && options.memoryMode !== "off") {
      const agentMemory = recallAgentMemory(options.sourceId);
      if (agentMemory) sections.push(agentMemory);
    }

    const toolCtx = options.getContext?.();
    if (toolCtx && (toolCtx.currentPage || (toolCtx.pages && toolCtx.pages.length > 0))) {
      const contextString = buildContext({
        page: toolCtx.currentPage as never,
        pages: toolCtx.pages as never[],
        options: aiManager.getConfig().context,
      });
      if (contextString) sections.push(`---\n\n## Workspace Context\n\n${contextString}`);
    }
    sections.push(`---\n\n## Task\n${instruction}`);
    return sections.join("\n\n");
  }

  private async runAnswerStep(step: PlanStep, options: RuntimeJobOptions, context: ExecutionContext): Promise<{ ok: boolean; text?: string; isText?: boolean; fatal?: boolean; detail?: string }> {
    const selection = selectModel("default");
    const messages = [{ role: "user", content: this.buildUserPrompt(step.instruction || options.goal, options) }];
    const usage = usageSink(context);
    try {
      const result = await aiManager.sendRaw({
        system: this.buildSystemPrompt(options, false, context.effort),
        messages,
        maxTokens: 2048,
        effort: context.effort,
        providerId: selection.providerId,
        modelId: selection.modelId,
        onUsage: usage.onUsage,
      });
      usage.settle();
      context.vars["ai.response"] = result;
      return { ok: true, text: stripToolCalls(result), isText: true };
    } catch (err) {
      return { ok: false, fatal: true, detail: err instanceof Error ? err.message : "Model request failed" };
    }
  }

  private async runAiStep(
    step: PlanStep,
    options: RuntimeJobOptions,
    context: ExecutionContext,
    _emit: () => void,
    track: (type: RunEventType, detail?: string, step?: string, durationMs?: number) => void
  ): Promise<{ ok: boolean; detail?: string; text?: string; isText?: boolean; fatal?: boolean }> {
    const selection = selectModel("default");
    let accumulatedText = "";
    // Persistent transcript: each round keeps the workspace context and the
    // model's own previous outputs/results, so it can self-correct across
    // rounds instead of re-deriving everything from a fresh single message.
    const transcript: Array<{ role: string; content: string }> = [];
    // Interactive runs replay the recent conversation so follow-up requests
    // ("now add a todo to that page") resolve against prior turns.
    const history = (options.history || [])
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, HISTORY_MESSAGE_CAP) }))
      .filter((m) => m.content.trim());
    // One repair round is allowed per step: when the model clearly TRIED to
    // call a tool but the parse came up empty, we re-ask with the exact format.
    let repairUsed = false;
    // Repetition circuit-breaker: stuck models re-emit the SAME tool call
    // every round (succeeding harmlessly or failing identically). After one
    // nudge, a full round of repeats ends the step.
    const attemptedSigs = new Set<string>();
    let loopNudgeUsed = false;
    let anyToolSucceeded = false;
    // Native function calling: providers that support it get the schemas in
    // the request; unsupported ones ignore the field and follow the text
    // protocol already present in the system prompt.
    const toolSchemas = getToolSchemas();
    // Interactive runs stream the model's text live while the step runs.
    // Tool calls still parse from the final text via the marker protocol;
    // background runs keep non-streaming sendRaw (native tool calling).
    const useStream = typeof options.onLiveText === "function" && options.sourceKind === "ai";

    for (let round = 0; round < MAX_MODEL_ROUNDS_PER_STEP; round++) {
      if (context.abort.aborted) return { ok: false, detail: "Aborted" };
      if (transcript.length === 0) {
        transcript.push(...history);
        transcript.push({ role: "user", content: this.buildUserPrompt(step.instruction || options.goal, options) });
      }
      const roundStart = Date.now();
      track("MODEL_REQUEST", `round ${round + 1}`, step.label);
      let response: string;
      const usage = usageSink(context);
      try {
        if (useStream) {
          // Invariant at call time: transcript ends with the current user
          // message (the task on round 0, tool results afterwards).
          response = await aiManager.stream({
            system: this.buildSystemPrompt(options, true, undefined),
            messages: transcript.slice(0, -1),
            prompt: transcript[transcript.length - 1].content,
            maxTokens: 2048,
            effort: context.effort,
            onChunk: (partial) => options.onLiveText?.(stripToolCalls(partial), step.id),
            tools: toolSchemas,
            onUsage: usage.onUsage,
          });
        } else {
          response = await aiManager.sendRaw({
            system: this.buildSystemPrompt(options, true, context.effort),
            messages: transcript,
            maxTokens: 2048,
            effort: context.effort,
            providerId: selection.providerId,
            modelId: selection.modelId,
            tools: toolSchemas,
            onUsage: usage.onUsage,
          });
        }
        usage.settle();
      } catch (err) {
        usage.settle();
        track("MODEL_RESPONSE", `failed: ${err instanceof Error ? err.message : "error"}`, step.label, Date.now() - roundStart);
        // If the model is unreachable, remaining steps can't run meaningfully —
        // fail the run honestly instead of reporting a false completion (#17).
        return { ok: false, fatal: true, detail: err instanceof Error ? err.message : "Model request failed" };
      }
      track("MODEL_RESPONSE", `${Math.ceil(response.length / 4)} tokens`, step.label, Date.now() - roundStart);

      const calls = parseToolCalls(response);
      const visible = stripToolCalls(response);
      if (visible) accumulatedText = visible;

      if (calls.length > 0) {
        // Repetition check (semantic): every call in this round already
        // attempted earlier in this step, after normalizing case/whitespace.
        const sigs = calls.map((c) => normalizedToolSig(c.name, c.params));
        if (sigs.every((s) => attemptedSigs.has(s))) {
          if (!loopNudgeUsed) {
            loopNudgeUsed = true;
            track("MODEL_REQUEST", "repetition guard", step.label);
            transcript.push({ role: "assistant", content: visible || `(repeated: ${calls.map((c) => c.name).join(", ")})` });
            transcript.push({
              role: "user",
              content: "You already executed these exact tool calls successfully — the results are above. Do NOT repeat them. Write your final short summary now with no tool blocks.",
            });
            continue;
          }
          context.vars["ai.response"] = accumulatedText;
          return {
            ok: anyToolSucceeded,
            text: accumulatedText || undefined,
            isText: accumulatedText.length > 0,
            detail: anyToolSucceeded ? "Stopped: repeated identical tool calls" : "Repeated identical tool calls without success",
          };
        }
        sigs.forEach((s) => attemptedSigs.add(s));
      }

      if (calls.length === 0) {
        // Repair: the output looks like a mangled/blocked tool call — give the
        // model exactly one nudge with the format before accepting the text.
        if (!repairUsed && round < MAX_MODEL_ROUNDS_PER_STEP - 1 && looksLikeBrokenToolCall(response)) {
          repairUsed = true;
          track("MODEL_REQUEST", "tool-format repair", step.label);
          transcript.push({ role: "assistant", content: visible || response.slice(0, 500) });
          transcript.push({
            role: "user",
            content: "Your tool call could not be parsed. Emit it EXACTLY like:\n<<TOOL:tool_name>>{\"param\":\"value\"}<</TOOL>>\nThen continue. If no tool is needed, reply in plain text only.",
          });
          continue;
        }
        context.vars["ai.response"] = visible;
        return { ok: true, text: visible || undefined, isText: visible.length > 0 };
      }

      // Execute tool calls through permission gate + verification. Calls in
      // one round are independent by construction (the model emitted them
      // together), so they run in parallel; records/outcomes keep call order.
      const beforeSnapshot = snapshotWorkspace(options.getContext);
      const outcomes: string[] = [];
      const roundRecords: Array<{ record: ToolCallRecord; params: Record<string, unknown>; result: unknown }> = [];
      const executed = await Promise.all(calls.map(async (call) => {
        const toolStart = Date.now();
        track("TOOL_REQUESTED", undefined, call.name);
        const record = await this.gatedExecute(call.name, call.params, options, context);
        return { call, record, toolStart };
      }));
      for (const { call, record, toolStart } of executed) {
        context.run.toolCalls.push(record);
        if (record.ok) anyToolSucceeded = true;
        roundRecords.push({ record, params: call.params, result: (record as ToolCallRecord & { rawResult?: unknown }).rawResult });
        track(
          record.ok ? "TOOL_COMPLETED" : "TOOL_FAILED",
          record.ok ? record.resultSummary : record.error,
          call.name,
          Date.now() - toolStart,
        );
        if (record.ok && record.resultSummary) {
          outcomes.push(`Tool ${call.name} succeeded. Result: ${record.resultSummary}`);
        } else if (!record.ok) {
          outcomes.push(`Tool ${call.name} failed: ${record.error}`);
        }
        context.vars[`tool.${call.name}`] = record.ok ? (call.params as unknown) : undefined;
      }
      const afterSnapshot = snapshotWorkspace(options.getContext);

      // Verify mutations from this round — never claim success without evidence.
      for (const { record, params, result } of roundRecords) {
        const verified = verifyToolCall(record, params, result, beforeSnapshot, afterSnapshot);
        record.verified = verified;
        if (!verified && record.ok) {
          record.error = "could not be verified";
          context.run.errors.push(`Verification could not confirm the effect of ${record.name}.`);
        }
      }

      const affected = collectAffectedResources(
        roundRecords.map((r) => ({ name: r.record.name, ok: r.record.ok })),
        roundRecords.map((r) => r.params),
        []
      );
      context.run.affectedResources.push(...affected);

      transcript.push({ role: "assistant", content: visible || `(used tools: ${calls.map((c) => c.name).join(", ")})` });
      transcript.push({
        role: "user",
        content: `Tool execution results:\n${outcomes.join("\n")}\n\nContinue the task based on these results. If a tool failed, try a different approach. If the task is complete, write a short completion summary with no tool blocks.`,
      });
    }

    context.vars["ai.response"] = accumulatedText;
    // Honest exhaustion: if every round's tool calls failed, the step failed —
    // never let the run report success for work that never happened.
    return {
      ok: anyToolSucceeded,
      text: accumulatedText || undefined,
      isText: accumulatedText.length > 0,
      detail: anyToolSucceeded ? "Reached max tool rounds" : "Tools kept failing — step abandoned",
    };
  }

  private async runDirectToolStep(step: PlanStep, options: RuntimeJobOptions, context: ExecutionContext): Promise<{ ok: boolean; detail?: string }> {
    if (!step.toolName) return { ok: false, detail: "Tool step missing toolName" };
    const params = { ...(step.toolParams || {}) } as Record<string, unknown>;
    const before = snapshotWorkspace(options.getContext);
    const record = await this.gatedExecute(step.toolName, params, options, context);
    context.run.toolCalls.push(record);
    if (record.ok) {
      const after = snapshotWorkspace(options.getContext);
      record.verified = verifyToolCall(record, params, (record as ToolCallRecord & { rawResult?: unknown }).rawResult, before, after);
      if (!record.verified) {
        record.error = "could not be verified";
        context.run.errors.push(`Verification could not confirm the effect of ${step.toolName}.`);
      }
      context.run.affectedResources.push(
        ...collectAffectedResources([{ name: step.toolName, ok: true }], [params], [(record as ToolCallRecord & { rawResult?: unknown }).rawResult])
      );
    }
    return { ok: record.ok, detail: record.ok ? record.resultSummary : record.error };
  }

  private async runApprovalGate(step: PlanStep, _options: RuntimeJobOptions, context: ExecutionContext): Promise<{ ok: boolean; detail?: string; fatal?: boolean }> {
    const decision = await requestApproval({
      executionId: context.run.id,
      category: "update",
      action: step.label,
      reason: step.instruction || "Approval required to continue",
    });
    context.run.approvals.push(decision.request);
    if (!decision.approved) {
      context.run.status = "rejected";
      return { ok: false, fatal: true, detail: "Rejected by user" };
    }
    return { ok: true, detail: "Approved" };
  }

  /**
   * Permission-gated tool execution with provenance-stamped actions.
   * Approval-required categories pause until the user responds.
   * `run_agent` (multi-agent delegation) is intercepted here — it never
   * reaches the plain workspace-tool dispatcher.
   */
  private async gatedExecute(toolName: string, params: Record<string, unknown>, options: RuntimeJobOptions, context: ExecutionContext): Promise<ToolCallRecord & { resultSummary?: string; rawResult?: unknown }> {
    if (toolName === "run_agent") {
      return this.executeDelegation(params, options, context);
    }
    if (toolName === "ask_user") {
      return this.askUser(params, context);
    }

    const decision = evaluatePermission(toolName, options.permissions);
    if (!decision.allowed) {
      return { name: toolName, ok: false, error: decision.reason || "Not permitted" };
    }
    if (decision.requiresApproval) {
      const approvalDecision = await requestApproval({
        executionId: context.run.id,
        category: decision.category!,
        action: toolName,
        reason: `${toolName} requires your approval`,
        params,
      });
      context.run.approvals.push(approvalDecision.request);
      if (!approvalDecision.approved) {
        context.run.status = "rejected";
        return { name: toolName, ok: false, error: "Blocked: user declined approval" };
      }
    }

    const toolCtx = options.getContext?.() || { pages: [], actions: {} };
    const safeCtx = {
      currentPage: toolCtx.currentPage as never,
      pages: (toolCtx.pages || []) as never,
      actions: stampActions(toolCtx.actions as Record<string, (...args: unknown[]) => unknown>, context.run),
    };

    try {
      const result = await runTool(toolName, params, safeCtx);
      const enriched = { name: toolName, ok: true, resultSummary: summarizeToolResult(result) } as ToolCallRecord & { resultSummary?: string; rawResult?: unknown };
      enriched.rawResult = result;
      return enriched;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Honest failure — no fabricated success.
      return { name: toolName, ok: false, error: message };
    }
  }

  /**
   * Clarify-when-unsure: pause the run on a question the user answers in the
   * UI. The answer is fed back as the tool result; declining/timeout yields
   * an honest "no answer" result the model must work around.
   */
  private async askUser(params: Record<string, unknown>, context: ExecutionContext): Promise<ToolCallRecord & { resultSummary?: string; rawResult?: unknown }> {
    const question = String(params.question || "").trim();
    if (!question) {
      return { name: "ask_user", ok: false, error: "ask_user needs a question" };
    }
    const decision = await requestClarification({
      executionId: context.run.id,
      question,
    });
    context.run.approvals.push({
      id: `apr_${uid().slice(0, 8)}`,
      executionId: context.run.id,
      category: "clarify",
      action: question,
      reason: decision.answer != null ? "Answered by user" : "No answer provided",
      resolvedAt: new Date().toISOString(),
      approved: decision.answer != null,
    });
    if (decision.answer == null) {
      return { name: "ask_user", ok: false, error: "The user did not answer — proceed with your best judgment and state your assumption." };
    }
    return {
      name: "ask_user",
      ok: true,
      resultSummary: `User answered: ${decision.answer.slice(0, 200)}`,
      rawResult: { answer: decision.answer },
    } as ToolCallRecord & { resultSummary: string; rawResult: unknown };
  }

  /**
   * Multi-agent delegation: the current worker invokes another persisted
   * agent by name/id. Guarded by the "agents" permission category (approval
   * by default), loop protection rate caps, an isActive re-entrancy check,
   * and a hard delegation-depth limit. The delegate runs with ITS OWN
   * stored permissions — delegation never escalates privileges.
   */
  private async executeDelegation(params: Record<string, unknown>, options: RuntimeJobOptions, context: ExecutionContext): Promise<ToolCallRecord & { resultSummary?: string }> {
    // Delegation is governed solely by the caller's "agents" permission.
    const agentsMode = (options.permissions?.agents ?? "approval");
    if (agentsMode === "disabled") {
      return { name: "run_agent", ok: false, error: "Permission for agent delegation is disabled" };
    }
    if (agentsMode === "approval") {
      const approvalDecision = await requestApproval({
        executionId: context.run.id,
        category: "agents",
        action: `Delegate to agent "${String(params.agent_name || params.agent_id || "")}"`,
        reason: "Agent-to-agent delegation requires your approval",
        params,
      });
      context.run.approvals.push(approvalDecision.request);
      if (!approvalDecision.approved) {
        return { name: "run_agent", ok: false, error: "Blocked: user declined delegation" };
      }
    }

    const depth = this.delegationDepth;
    if (depth >= MAX_DELEGATION_DEPTH) {
      return { name: "run_agent", ok: false, error: `Delegation depth limit (${MAX_DELEGATION_DEPTH}) reached` };
    }

    const identifier = String(params.agent_name || params.agent_id || "").trim();
    if (!identifier) return { name: "run_agent", ok: false, error: "run_agent needs agent_name or agent_id" };

    try {
      const { fetchAgents } = await import("../../features/agents/agentStore");
      const agents = await fetchAgents();
      const target =
        agents.find((a) => a.id === identifier) ||
        agents.find((a) => a.name.toLowerCase() === identifier.toLowerCase()) ||
        agents.find((a) => a.name.toLowerCase().includes(identifier.toLowerCase()));
      if (!target) return { name: "run_agent", ok: false, error: `No agent found matching "${identifier}"` };
      if (target.status !== "active") return { name: "run_agent", ok: false, error: `Agent "${target.name}" is paused` };
      if (target.id === options.sourceId) return { name: "run_agent", ok: false, error: "An agent cannot delegate to itself" };
      if (this.isActive(target.id)) return { name: "run_agent", ok: false, error: `Agent "${target.name}" is already running` };

      const rateBlock = this.noteManualRun(target.id);
      if (rateBlock) return { name: "run_agent", ok: false, error: rateBlock };

      const instruction = String(params.instruction || "").trim();
      this.delegationDepth += 1;
      let childRun;
      try {
        childRun = await this.execute({
          goal: target.instructions || target.name,
          sourceId: target.id,
          sourceKind: "agent",
          trigger: "manual",
          triggerDetail: `delegated by ${options.sourceId}`,
          permissions: target.permissions,
          modelClassOverride: target.modelClass === "default" ? undefined : target.modelClass,
          instructions: [
            `You were invoked by another worker ("${options.sourceId}") as a specialist.`,
            instruction ? `Specific task for this invocation: ${instruction}` : "",
            `Your standing purpose: ${target.description || target.name}.`,
          ].filter(Boolean).join("\n"),
          getContext: options.getContext,
          maxSteps: Math.min(options.maxSteps ?? 6, 6),
          onProgress: undefined,
        });
      } finally {
        this.delegationDepth -= 1;
      }
      context.vars[`agent.${target.name}.summary`] = childRun.summary || childRun.status;
      return {
        name: "run_agent",
        ok: childRun.status === "completed",
        error: childRun.status === "completed" ? undefined : childRun.errors[0] || `delegate finished ${childRun.status}`,
        resultSummary: `${target.name}: ${childRun.summary || childRun.status}`.slice(0, 200),
      };
    } catch (err) {
      return { name: "run_agent", ok: false, error: err instanceof Error ? err.message : "Delegation failed" };
    }
  }

  /** Guard used by the trigger service before starting event-driven runs. */
  canTrigger(sourceId: string, event: { type: string; pageId?: string; blockText?: string; provenance?: { sourceId: string } }): string | null {
    return loopProtector.checkTrigger(sourceId, {
      type: event.type as never,
      pageId: event.pageId,
      blockText: event.blockText,
      provenance: event.provenance as never,
      at: now(),
    });
  }

  noteTriggerAccepted(sourceId: string, event: { type: string; pageId?: string; blockText?: string }): void {
    loopProtector.recordRun(sourceId, { type: event.type as never, pageId: event.pageId, blockText: event.blockText, at: now() });
  }

  noteManualRun(sourceId: string): string | null {
    return loopProtector.checkAndRecordManual(sourceId);
  }
}

// Helper kept outside the class so gatedExecute stays readable.

/**
 * Normalized tool-call signature for repetition detection: case-insensitive,
 * whitespace-collapsed strings and sorted object keys, so "INBOX " vs "inbox"
 * count as the same call while genuinely different args stay distinct.
 */
function normalizedToolSig(name: string, params: Record<string, unknown>): string {
  const norm = (v: unknown): unknown => {
    if (typeof v === "string") return v.toLowerCase().replace(/\s+/g, " ").trim();
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = norm((v as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return v;
  };
  return `${name.toLowerCase()}:${JSON.stringify(norm(params || {}))}`;
}

/** Heuristic for a tool attempt that failed to parse (marker fragments,
 * truncated JSON, stray function-call syntax) — gates the repair round. */
function looksLikeBrokenToolCall(response: string): boolean {
  if (!response) return false;
  return /<<\s*TOOL|TOOL\s*:|<\s*\/TOOL|\btool_calls?\b|"name"\s*:\s*"[a-z_]+"/i.test(response);
}

function summarizeToolResult(result: unknown): string {
  if (result == null) return "ok";
  if (typeof result === "string") return result.slice(0, 200);
  if (typeof result === "number" || typeof result === "boolean") return String(result);
  try {
    const obj = result as Record<string, unknown>;
    if (obj.pageId) return `page "${obj.title || obj.pageId}"`;
    if (obj.count !== undefined) return `${obj.count} item(s)`;
    const s = JSON.stringify(result);
    return s.length > 200 ? `${s.slice(0, 197)}…` : s;
  } catch {
    return "ok";
  }
}

/** Singleton runtime — one shared engine for AI, agents, and automations. */
export const agentRuntime = new AgentRuntime();
