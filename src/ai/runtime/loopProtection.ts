/**
 * Noska Intelligence — Loop Protection
 *
 * Prevents runaway automation/agent loops:
 *   page updated → automation runs → automation updates page → page updated → …
 *
 * Layers of defense:
 *   1. Provenance   — mutations caused by an execution carry its executionId;
 *                     event triggers ignore events they caused themselves.
 *   2. Deduplication — identical (trigger, resource, content-hash) events
 *                     within a short window run once.
 *   3. Cooldown     — a source can't re-run more often than its cooldown.
 *   4. Max runs     — per-source cap per rolling hour.
 */

import type { WorkspaceEvent } from "./types";

interface LoopGuardOptions {
  /** minimum ms between two runs of the same source */
  cooldownMs?: number;
  /** max runs per source per rolling hour */
  maxRunsPerHour?: number;
  /** dedup window for identical events */
  dedupWindowMs?: number;
}

const DEFAULTS: Required<LoopGuardOptions> = {
  cooldownMs: 30_000,
  maxRunsPerHour: 20,
  dedupWindowMs: 10_000,
};

function hashEvent(evt: WorkspaceEvent): string {
  const payload = JSON.stringify([evt.type, evt.pageId, evt.blockId, evt.blockText]);
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  }
  return String(h);
}

export class LoopProtector {
  private lastRunAt: Map<string, number> = new Map();
  private recentHashes: Map<string, { hash: string; at: number }> = new Map();
  private hourlyRuns: Map<string, number[]> = new Map();
  private options: Required<LoopGuardOptions>;

  constructor(options: LoopGuardOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /**
   * Should this workspace event be allowed to trigger a run for `sourceId`?
   * Returns null when allowed, or a human-readable reason when blocked.
   */
  checkTrigger(sourceId: string, event: WorkspaceEvent): string | null {
    const now = Date.now();

    // 1. Provenance: never react to our own mutations.
    if (event.provenance?.sourceId === sourceId) {
      return "blocked: event was caused by this source itself";
    }
    // Broader rule: any runtime-caused mutation never retriggers event
    // automations/agents (only schedules and manual runs chain work).
    if (event.provenance && event.type !== "manual") {
      return "blocked: event originated from another runtime execution";
    }

    // 2. Deduplication
    const hash = hashEvent(event);
    const seen = this.recentHashes.get(sourceId);
    if (seen && seen.hash === hash && now - seen.at < this.options.dedupWindowMs) {
      return "blocked: identical event already handled moments ago";
    }

    // 3. Cooldown
    const last = this.lastRunAt.get(sourceId);
    if (last && now - last < this.options.cooldownMs) {
      return `blocked: cooling down (${Math.ceil((this.options.cooldownMs - (now - last)) / 1000)}s left)`;
    }

    // 4. Max runs / rolling hour
    const runs = (this.hourlyRuns.get(sourceId) || []).filter((t) => now - t < 3_600_000);
    if (runs.length >= this.options.maxRunsPerHour) {
      return `blocked: reached ${this.options.maxRunsPerHour} runs/hour limit`;
    }

    return null;
  }

  /** Record that a run started (call only after checkTrigger passed). */
  recordRun(sourceId: string, event: WorkspaceEvent): void {
    const now = Date.now();
    this.lastRunAt.set(sourceId, now);
    this.recentHashes.set(sourceId, { hash: hashEvent(event), at: now });
    const runs = (this.hourlyRuns.get(sourceId) || []).filter((t) => now - t < 3_600_000);
    runs.push(now);
    this.hourlyRuns.set(sourceId, runs);
  }

  /** Manual/scheduled runs bypass event checks but still count toward caps. */
  checkAndRecordManual(sourceId: string): string | null {
    const now = Date.now();
    const runs = (this.hourlyRuns.get(sourceId) || []).filter((t) => now - t < 3_600_000);
    if (runs.length >= this.options.maxRunsPerHour) {
      return `blocked: reached ${this.options.maxRunsPerHour} runs/hour limit`;
    }
    runs.push(now);
    this.hourlyRuns.set(sourceId, runs);
    return null;
  }

  reset(): void {
    this.lastRunAt.clear();
    this.recentHashes.clear();
    this.hourlyRuns.clear();
  }
}

export const loopProtector = new LoopProtector();
