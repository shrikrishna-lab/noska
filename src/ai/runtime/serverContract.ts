/**
 * Noska Agent OS — Server Contract
 *
 * Pure, dependency-free logic shared by three runtimes that must agree:
 *   1. The browser runtime  (src/ai/runtime/*)
 *   2. The Trigger.dev jobs (trigger/jobs/*)   — imports via relative path
 *   3. The Edge Function    (supabase/functions/agent-runtime) — same
 *
 * No browser APIs, no Supabase imports — everything here must run in Node,
 * Deno, and the browser unchanged.
 */

// ─── Execution states (single source of truth for UI + backend) ────────────

export type RunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_retry"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped"
  | "timed_out";

export const TERMINAL_STATUSES: RunStatus[] = ["completed", "failed", "cancelled", "skipped", "timed_out"];

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as RunStatus);
}

// ─── Event types ────────────────────────────────────────────────────────────

export type RunEventType =
  | "RUN_STARTED" | "TRIGGER_RECEIVED" | "CONTEXT_LOADED"
  | "MEMORY_SEARCH" | "MEMORY_FOUND" | "MEMORY_WRITE_CANDIDATE" | "MEMORY_CONFLICT" | "MEMORY_SAVED"
  | "TOOL_REQUESTED" | "TOOL_APPROVAL_REQUIRED" | "TOOL_APPROVED" | "TOOL_COMPLETED"
  | "TOOL_SKIPPED" | "TOOL_FAILED" | "TOOL_DRY_RUN"
  | "MODEL_REQUEST" | "MODEL_RESPONSE"
  | "AGENT_DELEGATED" | "CHILD_RUN_LINKED"
  | "APPROVAL_REQUESTED" | "APPROVAL_RESOLVED"
  | "RETRY_STARTED" | "TIMEOUT_WARNING"
  | "RUN_COMPLETED" | "RUN_FAILED" | "RUN_TIMED_OUT" | "RUN_CANCELLED" | "DRY_RUN_NOTICE";

// ─── Retry policy ───────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;      // additional attempts after the first
  baseDelayMs: number;     // first backoff
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxRetries: 2, baseDelayMs: 30_000, maxDelayMs: 15 * 60_000 };

/** Exponential backoff with cap: attempt is 0-based (first retry = 0). */
export function backoffDelayMs(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const delay = policy.baseDelayMs * Math.pow(2, Math.max(0, attempt));
  return Math.min(delay, policy.maxDelayMs);
}

/**
 * Retryable vs permanent failures. Permission/configuration problems will
 * never fix themselves by re-running — they fail fast.
 */
export function isRetryableError(message: string): boolean {
  const m = (message || "").toLowerCase();
  if (!m) return false;
  const permanent = [
    "permission", "not permitted", "disabled", "declined", "approval",
    "invalid api key", "unauthorized", "forbidden", "no agent found",
    "missing required parameter", "unknown tool", "paused", "not configured",
    "check constraint", "rls",
  ];
  if (permanent.some((p) => m.includes(p))) return false;
  // Transient infrastructure/model issues
  const transient = ["timeout", "timed out", "network", "fetch", "econnreset", "socket", "502", "503", "504", "rate limit", "429", "overloaded", "failed"];
  return transient.some((p) => m.includes(p)) || true; // default: retry unknowns a bounded number of times
}

// ─── Idempotency ────────────────────────────────────────────────────────────

/** automationId + scheduledFor uniquely identifies a scheduled execution. */
export function scheduledRunIdempotencyKey(sourceId: string, scheduledForIso: string): string {
  return `${sourceId}:${scheduledForIso}`;
}

export function eventRunIdempotencyKey(sourceId: string, eventId: string): string {
  return `${sourceId}:evt:${eventId}`;
}

// ─── Timezone-aware schedule slots ──────────────────────────────────────────

export interface ScheduleSpecLite {
  kind: "every_day" | "every_weekday" | "weekly" | "monthly" | "interval";
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  intervalMinutes?: number;
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return 0; // invalid timezone falls back to UTC
  }
}

/** Wall-clock parts of an instant in a given timezone. */
export function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const offset = tzOffsetMinutes(date, timeZone);
  const shifted = new Date(date.getTime() + offset * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(), // 0=Sunday
  };
}

function matchesDay(spec: ScheduleSpecLite, date: Date, tz: string): boolean {
  const p = zonedParts(date, tz);
  switch (spec.kind) {
    case "every_day": return true;
    case "every_weekday": return p.weekday >= 1 && p.weekday <= 5;
    case "weekly": return p.weekday === (spec.dayOfWeek ?? 0);
    case "monthly": return p.day === (spec.dayOfMonth ?? 1);
    default: return false;
  }
}

/**
 * Latest occurrence of the schedule at or before `now` (in `tz`), or null.
 * Walks back day-by-day — bounded at 400 iterations.
 */
export function lastSlotOnOrBefore(spec: ScheduleSpecLite, now: Date, tz: string): Date | null {
  const p = zonedParts(now, tz);
  const offset = tzOffsetMinutes(now, tz);
  // Today's slot at spec time (zoned) expressed as UTC instant:
  const todayZonedMidnightUtc = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - offset * 60_000;
  for (let i = 0; i < 400; i++) {
    const dayStart = new Date(todayZonedMidnightUtc - i * 86_400_000);
    if (matchesDay(spec, dayStart, tz)) {
      const dp = zonedParts(dayStart, tz);
      const candidate = new Date(Date.UTC(dp.year, dp.month - 1, dp.day, spec.hour ?? 8, spec.minute ?? 0, 0) - offset * 60_000);
      if (candidate.getTime() <= now.getTime()) return candidate;
    }
  }
  return null;
}

export type MissedPolicy = "run_immediately" | "skip" | "run_once_latest" | "catch_up";

export interface DueDecision {
  due: boolean;
  /** ISO instants this decision covers (for idempotency keys). */
  slots: string[];
  skippedCount: number;
  reason: string;
}

/**
 * Decide whether a schedule should fire NOW, honoring missed-run policy.
 * `lastRunAt` is when this source last executed ANY slot.
 *
 * Guarantees: each returned slot maps to exactly one idempotency key, so
 * retries/duplicates collapse on the unique constraint in agent_runs.
 */
export function decideDue(
  spec: ScheduleSpecLite,
  opts: { now: Date; lastRunAt: Date | null; tz: string; policy: MissedPolicy }
): DueDecision {
  const { now, lastRunAt, tz, policy } = opts;

  if (spec.kind === "interval") {
    const intervalMs = Math.max((spec.intervalMinutes || 15) * 60_000, 60_000);
    const elapsed = now.getTime() - (lastRunAt?.getTime() ?? 0);
    if (elapsed >= intervalMs) {
      return { due: true, slots: [new Date(now).toISOString()], skippedCount: 0, reason: "interval elapsed" };
    }
    return { due: false, slots: [], skippedCount: 0, reason: "interval not elapsed" };
  }

  const latestSlot = lastSlotOnOrBefore(spec, now, tz);
  if (!latestSlot) return { due: false, slots: [], skippedCount: 0, reason: "no occurrence found" };

  const neverRan = !lastRunAt;
  if (neverRan) {
    return { due: true, slots: [latestSlot.toISOString()], skippedCount: 0, reason: "first run" };
  }

  if (latestSlot.getTime() <= lastRunAt!.getTime()) {
    return { due: false, slots: [], skippedCount: 0, reason: "latest slot already consumed" };
  }

  // Count how many full slots were missed between lastRun and now.
  let missed = 0;
  const cursor = new Date(lastRunAt!);
  for (let i = 0; i < 400; i++) {
    const next = nextSlotAfter(spec, cursor, tz, latestSlot);
    if (!next) break;
    missed++;
    cursor.setTime(next.getTime());
  }

  switch (policy) {
    case "skip":
      return { due: false, slots: [], skippedCount: missed, reason: `skipped ${missed} missed slot(s)` };
    case "run_once_latest":
      return { due: true, slots: [latestSlot.toISOString()], skippedCount: missed, reason: `running latest of ${missed + 1} due slot(s)` };
    case "run_immediately":
      return { due: true, slots: [new Date(now).toISOString()], skippedCount: missed, reason: "missed → immediate catch-up" };
    case "catch_up": {
      // Cap catch-up bursts to avoid runaway storms.
      const slots: string[] = [];
      const c = new Date(lastRunAt!);
      for (let i = 0; i < Math.min(missed, 5); i++) {
        const next = nextSlotAfter(spec, c, tz, latestSlot);
        if (!next) break;
        slots.push(next.toISOString());
        c.setTime(next.getTime());
      }
      return { due: slots.length > 0, slots, skippedCount: Math.max(0, missed - slots.length), reason: `catching up ${slots.length} slot(s)` };
    }
  }
}

function nextSlotAfter(spec: ScheduleSpecLite, after: Date, tz: string, ceiling: Date): Date | null {
  const p = zonedParts(after, tz);
  const offset = tzOffsetMinutes(after, tz);
  for (let i = 0; i <= 400; i++) {
    const dayStart = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - offset * 60_000 + i * 86_400_000);
    if (matchesDay(spec, dayStart, tz)) {
      const dp = zonedParts(dayStart, tz);
      const candidate = new Date(Date.UTC(dp.year, dp.month - 1, dp.day, spec.hour ?? 8, spec.minute ?? 0, 0) - tzOffsetMinutes(dayStart, tz) * 60_000);
      if (candidate.getTime() > after.getTime() && candidate.getTime() <= ceiling.getTime()) return candidate;
    }
  }
  return null;
}

/**
 * Next occurrence STRICTLY after `after` (unbounded ceiling), for advancing
 * next_run_at. Returns null only if no occurrence exists within 400 days.
 */
export function nextSlotStrictlyAfter(spec: ScheduleSpecLite, after: Date, tz: string): Date | null {
  return nextSlotAfter(spec, after, tz, new Date(after.getTime() + 400 * 86_400_000));
}

// ─── Secret redaction ───────────────────────────────────────────────────────

const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g,            // openai/openrouter style keys
  /nsk_[A-Za-z0-9_-]{8,}/g,           // noska api keys
  /Bearer\s+[A-Za-z0-9._-]{10,}/g,    // auth headers
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // emails are PII too
];

/** Remove anything secret-shaped from strings before persistence. */
export function redact<T>(input: T, depth = 0): T {
  if (depth > 6) return input;
  if (typeof input === "string") {
    let out: string = input;
    out = out.replace(/(api[_-]?key|token|secret|password)(["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, "$1$2[REDACTED]");
    for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
    return out as unknown as T;
  }
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (/^(apikey|api_key|authorization|password|secret|token)$/i.test(k)) { out[k] = "[REDACTED]"; continue; }
      out[k] = redact(v, depth + 1);
    }
    return out as unknown as T;
  }
  return input;
}

// ─── Memory scoring & conflicts ─────────────────────────────────────────────

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in", "on", "for", "with", "that", "this", "it", "as", "at", "by", "from", "user", "prefers", "prefer"]);

export function extractKeywords(text: string, max = 12): string[] {
  const words = (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, max);
}

export interface MemoryScoreInput {
  keywords: string[];
  importance: number;      // 1..4
  confidence: number;      // 0..1
  updatedAt: Date;
  accessCount: number;
}

/** relevance · importance · recency · confidence · usage — bounded 0..10. */
export function scoreMemory(memory: MemoryScoreInput, taskKeywords: string[], now: Date): number {
  const overlap = memory.keywords.filter((k) => taskKeywords.includes(k)).length;
  const taskSet = new Set(taskKeywords);
  const precision = taskKeywords.length > 0 ? overlap / Math.max(memory.keywords.length, 1) : 0;
  const relevance = Math.min(overlap * 1.5 + precision * 2, 4);

  const ageDays = (now.getTime() - memory.updatedAt.getTime()) / 86_400_000;
  const recency = Math.max(0, 1 - ageDays / 90); // linear decay over ~3 months

  const importance = (memory.importance - 1) / 3;             // 0..1
  const confidence = Math.min(Math.max(memory.confidence, 0), 1);
  const usage = Math.min(memory.accessCount / 20, 1);

  const score = relevance * 1.6 + recency * 2 + importance * 1.6 + confidence * 0.8 + usage * 0.5;
  return Math.round(Math.min(score, 10) * 100) / 100;
}

export type MemoryRelation = "supersedes" | "contradicts" | "updates";

export interface ConflictCheck {
  conflict: boolean;
  relation: MemoryRelation | null;
  existingId?: string;
}

/**
 * Detect whether a new memory conflicts with an existing one.
 * High keyword overlap + opposing negation/polarity markers ⇒ contradiction;
 * high overlap + same polarity ⇒ update/supersede.
 */
export function detectConflict(
  newMemory: { content: string; keywords: string[] },
  existing: Array<{ id: string; content: string; keywords: string[] }>
): ConflictCheck {
  const NEGATIONS = ["not ", "no longer", "stop", "instead", "switched to", "changed to", "now prefer", "cancel"];
  const polarity = (text: string): number =>
    NEGATIONS.reduce((acc, n) => acc + (text.toLowerCase().includes(n) ? 1 : 0), 0) % 2; // 0 positive, 1 negative

  let best: { id: string; overlap: number } | null = null;
  for (const ex of existing) {
    const overlap = ex.keywords.filter((k) => newMemory.keywords.includes(k)).length;
    const minLen = Math.min(ex.keywords.length, newMemory.keywords.length) || 1;
    if (overlap >= Math.max(2, Math.ceil(minLen * 0.6))) {
      if (!best || overlap > best.overlap) best = { id: ex.id, overlap };
    }
  }
  if (!best) return { conflict: false, relation: null };

  const target = existing.find((e) => e.id === best!.id)!;
  const opposite = polarity(newMemory.content) !== polarity(target.content);
  if (opposite) return { conflict: true, relation: "contradicts", existingId: best.id };
  return { conflict: true, relation: "updates", existingId: best.id };
}

// ─── Resource limits (defense-in-depth vs runaway agents) ──────────────────

export const RESOURCE_LIMITS = {
  maxDelegationDepth: 1,
  maxToolCallsPerRun: 40,
  maxModelCallsPerRun: 30,
  maxMemoriesRetrieved: 8,
  maxMemoryWritesPerRun: 5,
  maxCatchUpSlots: 5,
  defaultTimeoutMs: 180_000,
  toolTimeoutMs: 30_000,
  modelTimeoutMs: 90_000,
} as const;
