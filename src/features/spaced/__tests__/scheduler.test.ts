import { describe, it, expect } from "vitest";
import { SM2Scheduler, FSRSScheduler, isBlockDue, getActiveScheduler } from "../scheduler";

const DAY = 86_400_000;

describe("SM2Scheduler", () => {
  it("first Good review schedules 1 day out", () => {
    const next = SM2Scheduler.schedule(undefined, 4);
    expect(next.interval).toBe(1);
    expect(next.repetition).toBe(1);
  });

  it("lapses reset repetition and schedule tomorrow", () => {
    const prev = { easeFactor: 2.5, interval: 10, repetition: 3 };
    const next = SM2Scheduler.schedule(prev, 1);
    expect(next.repetition).toBe(0);
    expect(next.interval).toBe(1);
  });
});

describe("FSRSScheduler", () => {
  it("initial state is due immediately", () => {
    const init = FSRSScheduler.initial();
    expect(new Date(init.nextReview).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("harder grades produce longer intervals", () => {
    const again = FSRSScheduler.schedule(undefined, 1);
    const hard = FSRSScheduler.schedule(undefined, 3);
    const good = FSRSScheduler.schedule(undefined, 4);
    const easy = FSRSScheduler.schedule(undefined, 5);
    expect(hard.interval).toBeGreaterThanOrEqual(again.interval);
    expect(good.interval).toBeGreaterThanOrEqual(hard.interval);
    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });

  it("successful reviews grow stability monotonically", () => {
    let state = FSRSScheduler.initial();
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      state = FSRSScheduler.schedule(state, 4);
      intervals.push(state.interval);
      // Simulate the passage of time between reviews.
      state.lastReview = new Date(Date.now() - (state.interval || 1) * DAY).toISOString();
    }
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it("a lapse shortens the next interval vs continued success", () => {
    let good = FSRSScheduler.initial();
    for (let i = 0; i < 3; i++) {
      good = FSRSScheduler.schedule(good, 4);
      good.lastReview = new Date(Date.now() - (good.interval || 1) * DAY).toISOString();
    }
    const lapsed = FSRSScheduler.schedule(good, 1);
    expect(lapsed.repetition).toBe(0);
    expect(lapsed.interval).toBeLessThan(good.interval);
  });

  it("carries pseudo-ease within legacy bounds", () => {
    const next = FSRSScheduler.schedule(undefined, 5);
    expect(next.easeFactor).toBeLessThanOrEqual(3);
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("queue gating + selection", () => {
  it("isBlockDue respects suspension and scheduling", () => {
    expect(isBlockDue(undefined)).toBe(false);
    expect(isBlockDue({ review: undefined })).toBe(false);
    expect(isBlockDue({ review: { suspended: true, nextReview: new Date(Date.now() - DAY).toISOString() } })).toBe(false);
    expect(isBlockDue({ review: { nextReview: new Date(Date.now() - DAY).toISOString() } })).toBe(true);
    expect(isBlockDue({ review: { nextReview: new Date(Date.now() + DAY).toISOString() } })).toBe(false);
  });

  it("defaults to SM-2 when no preference stored", () => {
    // jsdom localStorage starts empty in test env.
    expect(getActiveScheduler().name).toBe("sm2");
  });
});
