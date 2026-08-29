/**
 * Noska AI — Diagnostics
 *
 * Developer-only telemetry for understanding AI behavior.
 * Never exposes API keys, credentials, or raw chain-of-thought.
 */

export interface AIDiagnosticEntry {
  /** Request identification */
  id: string;
  timestamp: number;

  /** Intelligence analysis */
  intent: string;
  complexityScore: number;
  reasoningEffort: string;
  contextDepth: string;
  responseFormat: string;

  /** Model routing */
  selectedProvider: string;
  selectedModel: string;
  usedFallback: boolean;
  fallbackProvider?: string;
  fallbackModel?: string;
  fallbackReason?: string;

  /** Context budget */
  contextBudget: number;
  contextTokenEstimate: number;
  historyTokens: number;
  memoryTokens: number;
  workspaceTokens: number;
  historyMessageCount: number;
  prunedMessageCount: number;

  /** Execution */
  retryCount: number;
  toolCalls: number;
  latencyMs: number;
  /** Time to first token (streaming) */
  ttftMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;

  /** Result */
  finalStatus: "completed" | "cancelled" | "error" | "timeout" | "fallback";
  lastError: string | null;
  responseLength: number;
}

// ─── Ring Buffer for Recent Diagnostics ─────────────────────────────────────

const MAX_ENTRIES = 50;
const entries: AIDiagnosticEntry[] = [];
const listeners = new Set<(entry: AIDiagnosticEntry) => void>();

/** Record a diagnostic entry */
export function recordDiagnostic(entry: AIDiagnosticEntry): void {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  for (const fn of listeners) {
    try { fn(entry); } catch { /* ignore */ }
  }
  // Dev console output (collapsed)
  if (typeof console.groupCollapsed === "function") {
    console.groupCollapsed(
      `%c[AI] ${entry.intent} → ${entry.selectedProvider}/${entry.selectedModel} (${entry.latencyMs}ms)`,
      "color: #8AB4F8"
    );
    console.table({
      complexity: entry.complexityScore,
      reasoning: entry.reasoningEffort,
      context: `${entry.contextTokenEstimate}/${entry.contextBudget} tokens`,
      history: `${entry.prunedMessageCount}/${entry.historyMessageCount} messages`,
      status: entry.finalStatus,
      retries: entry.retryCount,
      tokens: `in=${entry.inputTokens || "?"} out=${entry.outputTokens || "?"}`,
    });
    console.groupEnd();
  }
}

/** Get recent diagnostics (newest first) */
export function getRecentDiagnostics(): AIDiagnosticEntry[] {
  return [...entries].reverse();
}

/** Subscribe to new diagnostic entries */
export function onDiagnostic(fn: (entry: AIDiagnosticEntry) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Create a diagnostic entry builder for a single request lifecycle */
export function createDiagnosticTracker(id: string): DiagnosticTracker {
  return new DiagnosticTracker(id);
}

export class DiagnosticTracker {
  private entry: AIDiagnosticEntry;
  private startTime: number;
  private firstTokenTime: number | null = null;

  constructor(id: string) {
    this.startTime = Date.now();
    this.entry = {
      id,
      timestamp: this.startTime,
      intent: "unknown",
      complexityScore: 0,
      reasoningEffort: "none",
      contextDepth: "standard",
      responseFormat: "standard",
      selectedProvider: "",
      selectedModel: "",
      usedFallback: false,
      contextBudget: 0,
      contextTokenEstimate: 0,
      historyTokens: 0,
      memoryTokens: 0,
      workspaceTokens: 0,
      historyMessageCount: 0,
      prunedMessageCount: 0,
      retryCount: 0,
      toolCalls: 0,
      latencyMs: 0,
      ttftMs: null,
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      finalStatus: "completed",
      lastError: null,
      responseLength: 0,
    };
  }

  setIntelligence(data: {
    intent: string;
    complexityScore: number;
    reasoningEffort: string;
    contextDepth: string;
    responseFormat: string;
  }): void {
    Object.assign(this.entry, data);
  }

  setModel(provider: string, model: string): void {
    this.entry.selectedProvider = provider;
    this.entry.selectedModel = model;
  }

  setFallback(provider: string, model: string, reason: string): void {
    this.entry.usedFallback = true;
    this.entry.fallbackProvider = provider;
    this.entry.fallbackModel = model;
    this.entry.fallbackReason = reason;
  }

  setContext(data: {
    contextBudget?: number;
    contextTokenEstimate?: number;
    historyTokens?: number;
    memoryTokens?: number;
    workspaceTokens?: number;
    historyMessageCount?: number;
    prunedMessageCount?: number;
  }): void {
    Object.assign(this.entry, data);
  }

  markFirstToken(): void {
    if (!this.firstTokenTime) {
      this.firstTokenTime = Date.now();
      this.entry.ttftMs = this.firstTokenTime - this.startTime;
    }
  }

  incrementRetry(): void {
    this.entry.retryCount++;
  }

  incrementToolCalls(): void {
    this.entry.toolCalls++;
  }

  setUsage(input: number | null, output: number | null, reasoning?: number | null): void {
    this.entry.inputTokens = input;
    this.entry.outputTokens = output;
    this.entry.reasoningTokens = reasoning ?? null;
  }

  setError(error: string): void {
    this.entry.lastError = error;
    this.entry.finalStatus = "error";
  }

  /** Finalize and record the diagnostic entry */
  finish(status: AIDiagnosticEntry["finalStatus"], responseLength: number): void {
    this.entry.latencyMs = Date.now() - this.startTime;
    this.entry.finalStatus = status;
    this.entry.responseLength = responseLength;
    recordDiagnostic(this.entry);
  }

  getEntry(): AIDiagnosticEntry { return { ...this.entry }; }
}
