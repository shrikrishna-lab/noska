/* ─── Spaced Repetition Scheduler Abstraction ───
 *
 * Single source of truth for everything review-state related. The UI
 * (SpacedRepetition modal, block context menu, /review slash command)
 * must only talk to this module — never inline scheduling math — so an
 * FSRS scheduler can replace SM-2 later without touching any UI.
 */

export interface ReviewState {
  easeFactor?: number;
  interval?: number;
  repetition?: number;
  nextReview?: string;
  lastReview?: string;
  quality?: number;
  /** Suspended cards leave the due queue but keep their history. */
  suspended?: boolean;
}

/** Fully-materialized state persisted onto a block after a rating. */
export type ScheduledReviewState = Required<Pick<ReviewState, "easeFactor" | "interval" | "repetition" | "nextReview" | "lastReview" | "quality">>;

export interface Scheduler {
  readonly name: string;
  /** Fresh state for a card that has never been reviewed. */
  initial(): ScheduledReviewState;
  /** Compute the next state from the previous one and a quality rating. */
  schedule(prev: ReviewState | undefined, quality: number): ScheduledReviewState;
}

const DAY_MS = 86_400_000;

function nowISO(): string {
  return new Date().toISOString();
}

/* ─── SM-2 (SuperMemo 2) — current default scheduler ─── */

export const SM2Scheduler: Scheduler = {
  name: "sm2",

  initial(): ScheduledReviewState {
    return {
      easeFactor: 2.5,
      interval: 0,
      repetition: 0,
      nextReview: nowISO(), // due immediately
      lastReview: nowISO(),
      quality: 0,
    };
  },

  schedule(prev: ReviewState | undefined, quality: number): ScheduledReviewState {
    let { easeFactor = 2.5, interval = 0, repetition = 0 } = prev ?? {};

    if (quality >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetition += 1;
    } else {
      repetition = 0;
      interval = 1;
    }

    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    return {
      easeFactor,
      interval,
      repetition,
      nextReview: new Date(Date.now() + interval * DAY_MS).toISOString(),
      lastReview: nowISO(),
      quality,
    };
  },
};

/* ─── Active scheduler ───
 * Swapping this single binding to FSRSScheduler migrates every card on
 * its next review — no UI changes required. */

export const activeScheduler: Scheduler = SM2Scheduler;

/* ─── Shared helpers (the ONLY writers of block.review metadata) ─── */

/** State for "Add to review" — due immediately. */
export function createReviewState(scheduler: Scheduler = activeScheduler): ScheduledReviewState {
  return scheduler.initial();
}

/** Patch payload for "Remove from review" — null is falsy-safe at every
 * read site (`if (block.review)`). Persisted inside the page's blocks
 * jsonb via the normal save pipeline. */
export function removedReviewState(): { review: null } {
  return { review: null };
}

/** A card is in the queue when it has review metadata, isn't suspended,
 * and its next review time has arrived (or was never scheduled). */
export function isBlockDue(block: { review?: ReviewState } | undefined): boolean {
  const r = block?.review;
  if (!r || r.suspended) return false;
  return !r.nextReview || r.nextReview <= nowISO();
}

/** Human label for the next due date ("Due today", "in 3d", …). */
export function formatNextReview(nextReview?: string): string {
  if (!nextReview) return "Not scheduled";
  const diffDays = Math.round((new Date(nextReview).getTime() - Date.now()) / DAY_MS);
  if (diffDays <= 0) return "Due now";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays}d`;
}
