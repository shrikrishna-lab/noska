/**
 * Noska Agent OS — Run Store (client)
 *
 * Durable execution records in Supabase (`agent_runs` / `agent_run_events`)
 * with a capped local mirror for offline reads. Client-side runs (interactive
 * AI sessions and manual runs) write the SAME rows the server executor
 * writes, so observability is unified no matter where execution happened.
 */

import { supabase, getAuthUserId } from "../../lib/supabase";
import { redact } from "./serverContract";
import type { RunRecord } from "./types";

const MIRROR_KEY = "noska_intelligence_runs";
const MAX_MIRRORED = 200;

const memoryRuns = new Map<string, RunRecord>();
const listeners = new Set<(runs: RunRecord[]) => void>();

// ─── Local mirror (offline-friendly cache) ─────────────────────────────────

function loadMirror(): RunRecord[] {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMirror(runs: RunRecord[]): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(runs.slice(0, MAX_MIRRORED)));
  } catch { /* best-effort */ }
}

export function upsertRun(run: RunRecord): void {
  const existing = loadMirror();
  const idx = existing.findIndex((r) => r.id === run.id);
  if (idx >= 0) existing[idx] = run;
  else existing.unshift(run);
  saveMirror(existing.slice(0, MAX_MIRRORED));
  memoryRuns.set(run.id, run);
  notify();
  void persistRunRemote(run);
}

function notify(): void {
  const runs = listRuns();
  for (const listener of listeners) {
    try { listener(runs); } catch { /* ignore */ }
  }
}

export function listRuns(limit = 100): RunRecord[] {
  const mirrored = loadMirror().slice(0, limit);
  const merged = new Map<string, RunRecord>();
  for (const r of mirrored) merged.set(r.id, r);
  for (const r of memoryRuns.values()) merged.set(r.id, r);
  return [...merged.values()]
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))
    .slice(0, limit);
}

export function getRun(id: string): RunRecord | null {
  return memoryRuns.get(id) || loadMirror().find((r) => r.id === id) || null;
}

export function subscribeRuns(listener: (runs: RunRecord[]) => void): () => void {
  listeners.add(listener);
  void refreshFromRemote();
  return () => listeners.delete(listener);
}

/** Pull durable history from agent_runs into the mirror (merged view). */
export async function refreshFromRemote(): Promise<void> {
  try {
    const anyDb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (c: string, o: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null }> } } };
    const { data } = await anyDb.from("agent_runs").select("*").order("started_at", { ascending: false });
    if (!data) return;
    const remote = data.map(rowToRun);
    const merged = new Map<string, RunRecord>();
    for (const r of remote) merged.set(r.id, r);
    for (const r of loadMirror()) if (!merged.has(r.id)) merged.set(r.id, r);
    saveMirror([...merged.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, MAX_MIRRORED));
    notify();
  } catch { /* offline or pre-migration — mirror only */ }
}

function rowToRun(row: Record<string, unknown>): RunRecord {
  const counts = (row.counts as Record<string, number>) ?? {};
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceKind: row.source_kind as RunRecord["sourceKind"],
    trigger: (row.trigger_type as never) || "manual",
    triggerDetail: undefined,
    status: mapStatus(String(row.status)),
    startedAt: (row.started_at as string) || (row.created_at as string),
    finishedAt: (row.completed_at as string) || undefined,
    steps: [],
    toolCalls: [],
    affectedResources: [],
    approvals: [],
    errors: [String(row.error_message || "")].filter(Boolean),
    summary: (row.final_output as string) || undefined,
    attempt: Number(row.attempt) || 1,
    parentRunId: (row.parent_run_id as string) || undefined,
    durationMs: Number(row.duration_ms) || undefined,
    counts: {
      modelCalls: counts.modelCalls ?? 0,
      toolCalls: counts.toolCalls ?? 0,
      delegations: counts.delegations ?? 0,
      memoryWrites: counts.memoryWrites ?? 0,
    },
  };
}

/** Server statuses are a superset — map unknowns gracefully. */
function mapStatus(status: string): RunRecord["status"] {
  switch (status) {
    case "queued": case "running": case "completed": case "failed":
    case "waiting_retry": case "skipped": case "timed_out":
      return status as RunRecord["status"];
    case "waiting_approval": return "awaiting_approval";
    case "cancelled": return "rejected";
    default: return "failed";
  }
}

// ─── Remote persistence ────────────────────────────────────────────────────

let ownerIdCache: string | null | undefined;

async function getOwnerId(): Promise<string | null> {
  if (ownerIdCache !== undefined) return ownerIdCache;
  try {
    const id = await getAuthUserId();
    ownerIdCache = id || null;
    return ownerIdCache;
  } catch {
    return null;
  }
}

/** Best-effort durable write of a client-side run — never blocks execution. */
export async function persistRunRemote(run: RunRecord): Promise<void> {
  try {
    const userId = await getOwnerId();
    if (!userId) return;
    const anyDb = supabase as unknown as { from: (t: string) => { upsert: (row: Record<string, unknown>, o: Record<string, unknown>) => Promise<unknown> } };
    await anyDb.from("agent_runs").upsert({
      id: run.id,
      user_id: userId,
      source_kind: run.sourceKind === "ai" ? "ai" : run.sourceKind,
      source_id: run.sourceId,
      name: run.sourceKind === "agent" ? run.triggerDetail || "" : "",
      trigger_type: String(run.trigger),
      status: reverseStatus(run.status),
      started_at: run.startedAt,
      completed_at: run.finishedAt || null,
      duration_ms: run.finishedAt ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime() : null,
      final_output: run.summary ? redact(run.summary).slice(0, 4000) : null,
      error_message: run.errors[0] ? redact(run.errors[0]).slice(0, 500) : null,
      error_code: run.status === "failed" ? "execution_failed" : null,
      counts: {
        modelCalls: 0,
        toolCalls: run.toolCalls.length,
        delegations: 0,
        memoryWrites: 0,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  } catch { /* offline/pre-migration */ }
}

function reverseStatus(status: RunRecord["status"]): string {
  switch (status) {
    case "awaiting_approval": return "waiting_approval";
    case "rejected": return "cancelled";
    default: return status;
  }
}

// ─── Execution trace (events) ──────────────────────────────────────────────

export interface RunEventRow {
  id?: string;
  runId: string;
  seq: number;
  type: string;
  step?: string;
  status?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

let eventSeqCounter = 0;

/** Append an observability event for a run (durable + best-effort). */
export async function recordRunEvent(evt: Omit<RunEventRow, "seq"> & { seq?: number }): Promise<void> {
  const seq = evt.seq ?? ++eventSeqCounter;
  try {
    const userId = await getOwnerId();
    if (!userId) return;
    const anyDb = supabase as unknown as { from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> } };
    await anyDb.from("agent_run_events").insert({
      run_id: evt.runId,
      user_id: userId,
      seq,
      type: evt.type,
      step: evt.step ?? null,
      status: evt.status ?? null,
      duration_ms: evt.durationMs ?? null,
      metadata: redact(evt.metadata ?? {}) as never,
    });
  } catch { /* best-effort */ }
}

/** Fetch the durable trace for a run (DB first, empty on failure). */
export async function fetchRunEvents(runId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const anyDb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { order: (c: string, o: Record<string, unknown>) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> } } } } };
    const { data } = await anyDb.from("agent_run_events").select("*").eq("run_id", runId).order("created_at", { ascending: true }).limit(200);
    return data ?? [];
  } catch {
    return [];
  }
}

// ─── Realtime live updates ─────────────────────────────────────────────────

/**
 * Subscribe to live changes of one run (status transitions + new events).
 * Returns an unsubscribe function. Uses Supabase Realtime — no polling.
 */
export function subscribeRunLive(
  runId: string,
  onUpdate: () => void
): () => void {
  const channel = supabase
    .channel(`agent-run-${runId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "agent_runs", filter: `id=eq.${runId}` } as never, onUpdate)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_run_events", filter: `run_id=eq.${runId}` } as never, onUpdate)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
