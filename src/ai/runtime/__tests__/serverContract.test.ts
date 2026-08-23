import { describe, it, expect } from "vitest";
import {
  isTerminal, backoffDelayMs, isRetryableError,
  scheduledRunIdempotencyKey, eventRunIdempotencyKey,
  decideDue, lastSlotOnOrBefore, nextSlotStrictlyAfter,
  redact, extractKeywords, scoreMemory, detectConflict,
  RESOURCE_LIMITS, type ScheduleSpecLite,
} from "../serverContract";

describe("run states", () => {
  it("identifies terminal statuses", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("running")).toBe(false);
    expect(isTerminal("waiting_approval")).toBe(false);
    expect(isTerminal("waiting_retry")).toBe(false);
  });
});

describe("retry policy", () => {
  it("computes exponential backoff with cap", () => {
    expect(backoffDelayMs(0)).toBe(30_000);
    expect(backoffDelayMs(1)).toBe(60_000);
    expect(backoffDelayMs(2)).toBe(120_000);
    // Cap: attempt 10 stays at max
    expect(backoffDelayMs(10)).toBe(15 * 60_000);
  });

  it("never retries permission/config errors", () => {
    expect(isRetryableError("Permission for delete actions is disabled")).toBe(false);
    expect(isRetryableError("Invalid API key provided")).toBe(false);
    expect(isRetryableError("user declined approval")).toBe(false);
    expect(isRetryableError("Agent \"X\" is paused")).toBe(false);
  });

  it("retries transient infrastructure errors", () => {
    expect(isRetryableError("network timeout")).toBe(true);
    expect(isRetryableError("model_http_503: overloaded")).toBe(true);
  });
});

describe("idempotency", () => {
  it("same automation+slot → same key; different slot → different key", () => {
    const a = scheduledRunIdempotencyKey("auto-1", "2026-08-23T08:00:00Z");
    const b = scheduledRunIdempotencyKey("auto-1", "2026-08-23T08:00:00Z");
    const c = scheduledRunIdempotencyKey("auto-1", "2026-08-24T08:00:00Z");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("event keys are distinct per event", () => {
    expect(eventRunIdempotencyKey("agent-1", "evt-1"))
      .not.toBe(eventRunIdempotencyKey("agent-1", "evt-2"));
  });
});

describe("timezone-aware schedule slots", () => {
  const daily8: ScheduleSpecLite = { kind: "every_day", hour: 8, minute: 0 };

  it("computes today's 8am slot in New York (EDT = UTC-4)", () => {
    const now = new Date("2026-08-20T14:00:00Z"); // 10am EDT — after 8am EDT
    const slot = lastSlotOnOrBefore(daily8, now, "America/New_York");
    expect(slot?.toISOString()).toBe("2026-08-20T12:00:00.000Z"); // 8am EDT
  });

  it("yesterday's slot when before schedule time in local zone", () => {
    const now = new Date("2026-08-20T10:00:00Z"); // 6am EDT — before 8am
    const slot = lastSlotOnOrBefore(daily8, now, "America/New_York");
    expect(slot?.toISOString()).toBe("2026-08-19T12:00:00.000Z");
  });

  it("UTC works trivially", () => {
    const now = new Date("2026-08-20T09:00:00Z");
    expect(lastSlotOnOrBefore(daily8, now, "UTC")?.getUTCHours()).toBe(8);
  });

  it("next slot strictly after", () => {
    const now = new Date("2026-08-20T09:00:00Z");
    const next = nextSlotStrictlyAfter(daily8, new Date("2026-08-20T08:30:00Z"), "UTC");
    expect(next?.toISOString()).toBe("2026-08-21T08:00:00.000Z");
  });

  it("weekly slots land on the right weekday across zones", () => {
    const friday16: ScheduleSpecLite = { kind: "weekly", dayOfWeek: 5, hour: 16 };
    // Thursday 3pm UTC → last Friday slot is previous week
    const thursday = new Date("2026-08-20T15:00:00Z");
    const slot = lastSlotOnOrBefore(friday16, thursday, "UTC");
    expect(slot?.getUTCDay()).toBe(5); // Friday
    expect(slot!.getTime()).toBeLessThan(thursday.getTime());
  });
});

describe("missed-run policies", () => {
  const daily8: ScheduleSpecLite = { kind: "every_day", hour: 8, minute: 0 };
  const wednesday = new Date("2026-08-19T08:00:00Z"); // ran Wednesday 8am
  const saturday = new Date("2026-08-22T09:00:00Z"); // checking Saturday 9am

  it("run_once_latest fires exactly once for the latest missed slot", () => {
    const d = decideDue(daily8, { now: saturday, lastRunAt: wednesday, tz: "UTC", policy: "run_once_latest" });
    expect(d.due).toBe(true);
    expect(d.slots).toHaveLength(1);
    // Latest missed slot = Saturday 08:00Z (today's occurrence)
    expect(d.slots[0]).toBe("2026-08-22T08:00:00.000Z");
    expect(d.skippedCount).toBeGreaterThanOrEqual(2); // Thu + Fri missed
  });

  it("skip policy does not fire but counts misses", () => {
    const d = decideDue(daily8, { now: saturday, lastRunAt: wednesday, tz: "UTC", policy: "skip" });
    expect(d.due).toBe(false);
    expect(d.slots).toHaveLength(0);
    expect(d.reason).toMatch(/skipped \d+/);
  });

  it("catch_up caps the burst", () => {
    const longAgo = new Date("2026-07-01T08:00:00Z");
    const d = decideDue(daily8, { now: saturday, lastRunAt: longAgo, tz: "UTC", policy: "catch_up" });
    expect(d.slots.length).toBeLessThanOrEqual(RESOURCE_LIMITS.maxCatchUpSlots);
  });

  it("interval schedules fire only after full interval", () => {
    const every5: ScheduleSpecLite = { kind: "interval", intervalMinutes: 5 };
    const last = new Date("2026-08-22T09:00:00Z");
    expect(decideDue(every5, { now: new Date(last.getTime() + 4 * 60_000), lastRunAt: last, tz: "UTC", policy: "run_once_latest" }).due).toBe(false);
    expect(decideDue(every5, { now: new Date(last.getTime() + 6 * 60_000), lastRunAt: last, tz: "UTC", policy: "run_once_latest" }).due).toBe(true);
  });

  it("first-ever run fires immediately for daily schedules past their time", () => {
    const d = decideDue(daily8, { now: saturday, lastRunAt: null, tz: "UTC", policy: "run_once_latest" });
    expect(d.due).toBe(true);
    expect(d.reason).toBe("first run");
  });

  it("already-consumed latest slot does not refire", () => {
    const justRan = new Date("2026-08-22T08:00:00Z");
    const d = decideDue(daily8, { now: new Date("2026-08-22T08:05:00Z"), lastRunAt: justRan, tz: "UTC", policy: "run_once_latest" });
    expect(d.due).toBe(false);
  });
});

describe("secret redaction", () => {
  it("strips provider keys, api keys and emails from strings", () => {
    const input = JSON.stringify({
      note: "use key sk-abc123def456ghi to connect",
      email: "user@example.com",
      nested: { authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6" },
      safe: "append blocks to page",
    });
    const out = JSON.stringify(redact(JSON.parse(input)));
    expect(out).not.toContain("sk-abc123def456ghi");
    expect(out).not.toContain("user@example.com");
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6");
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("append blocks to page");
  });

  it("redacts secret-named object fields entirely", () => {
    const out = redact({ apiKey: "super-secret-value", title: "ok" }) as Record<string, string>;
    expect(out.apiKey).toBe("[REDACTED]");
    expect(out.title).toBe("ok");
  });
});

describe("memory scoring & conflicts", () => {
  it("extracts keywords without stopwords", () => {
    const kw = extractKeywords("The user prefers weekly project reports on Fridays");
    expect(kw).toContain("weekly");
    expect(kw).toContain("reports");
    expect(kw).not.toContain("the");
  });

  it("ranks relevance + importance + recency", () => {
    const now = new Date();
    const high = scoreMemory(
      { keywords: ["project", "deadline"], importance: 4, confidence: 1, updatedAt: now, accessCount: 10 },
      ["project", "deadline"], now,
    );
    const low = scoreMemory(
      { keywords: ["unrelated"], importance: 1, confidence: 0.3, updatedAt: new Date(now.getTime() - 89 * 86_400_000), accessCount: 0 },
      ["project", "deadline"], now,
    );
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(10);
  });

  it("detects contradiction via polarity flip on overlapping keywords", () => {
    const existing = [{ id: "m1", content: "User prefers weekly reports for the marketing project", keywords: extractKeywords("User prefers weekly reports for the marketing project") }];
    const contradicting = detectConflict({ content: "User no longer prefers weekly reports for the marketing project — switch to daily", keywords: extractKeywords("no longer weekly reports marketing project daily") }, existing);
    expect(contradicting.conflict).toBe(true);
    expect(contradicting.relation).toBe("contradicts");

    const updating = detectConflict({ content: "Marketing project reports move to the shared dashboard", keywords: extractKeywords("marketing project reports shared dashboard") }, existing);
    expect(updating.relation === "updates" || updating.relation === null).toBe(true);
  });

  it("ignores unrelated memories", () => {
    const existing = [{ id: "m1", content: "Likes dark mode", keywords: ["dark", "mode"] }];
    const result = detectConflict({ content: "Project deadline moved to March", keywords: ["project", "deadline", "march"] }, existing);
    expect(result.conflict).toBe(false);
  });
});
