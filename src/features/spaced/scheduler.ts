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
  /** FSRS memory state — present only when the card was scheduled by
   * FSRSScheduler. SM-2 ignores these; FSRS prefers them when present. */
  stability?: number;
  difficulty?: number;
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

/* ─── FSRS-4.5 (Free Spaced Repetition Scheduler) ───
 * Three-component memory model (difficulty D, stability S, retrievability
 * R). Default parameter set from the open-spaced-repetition reference —
 * no per-user optimization yet. Cards scheduled by SM-2 migrate on their
 * next rating: FSRS seeds stability/difficulty from the grade when the
 * FSRS fields are absent.
 */

const FSRS_W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];
const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;

/** UI quality (1 Again · 3 Hard · 4 Good · 5 Easy; 2 tolerated as Hard)
 * → FSRS grade (1..4). */
function qualityToGrade(quality: number): number {
  if (quality <= 1) return 1;
  if (quality <= 3) return 2;
  if (quality === 4) return 3;
  return 4;
}

const clampF = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

function fsrsRetrievability(stability: number, elapsedDays: number): number {
  return Math.pow(1 + (FSRS_FACTOR * elapsedDays) / Math.max(stability, 0.01), FSRS_DECAY);
}

function fsrsInitStability(grade: number): number {
  return Math.max(FSRS_W[grade - 1], 0.1);
}

function fsrsInitDifficulty(grade: number): number {
  return clampF(FSRS_W[4] - (grade - 3) * FSRS_W[5], 1, 10);
}

function fsrsNextDifficulty(d: number, grade: number): number {
  const reverted = FSRS_W[7] * fsrsInitDifficulty(4) + (1 - FSRS_W[7]) * (d - FSRS_W[6] * (grade - 3));
  return clampF(reverted, 1, 10);
}

/** Map FSRS difficulty (1 easy … 10 hard) into the legacy ease-factor
 * field so analytics/mastery metrics keep working across schedulers. */
function fsrsPseudoEase(d: number): number {
  return Math.round((3.0 - ((d - 1) * 1.7) / 9) * 100) / 100;
}

export const FSRSScheduler: Scheduler = {
  name: "fsrs",

  initial(): ScheduledReviewState & { stability?: number; difficulty?: number } {
    const nowIso = nowISO();
    return {
      // Grade 3 (Good) initial memory state.
      easeFactor: 2.5,
      interval: 0,
      repetition: 0,
      nextReview: nowIso,
      lastReview: nowIso,
      quality: 0,
      stability: fsrsInitStability(3),
      difficulty: fsrsInitDifficulty(3),
    };
  },

  schedule(prev: ReviewState | undefined, quality: number): ScheduledReviewState & { stability?: number; difficulty?: number } {
    const grade = qualityToGrade(quality);
    const lastMs = prev?.lastReview ? new Date(prev.lastReview).getTime() : Date.now();
    const elapsedDays = Math.max(0, (Date.now() - lastMs) / DAY_MS);

    // Seed memory state from the previous card, or from this grade when
    // migrating an SM-2-scheduled card for the first time.
    let stability = typeof prev?.stability === "number" ? prev.stability : 0;
    let difficulty = typeof prev?.difficulty === "number" ? prev.difficulty : 0;
    if (!stability || !difficulty) {
      stability = fsrsInitStability(grade);
      difficulty = fsrsInitDifficulty(grade);
    }

    let repetition = prev?.repetition ?? 0;
    if (grade === 1) {
      // Lapse: stability collapses by the failure formula.
      const r = fsrsRetrievability(stability, elapsedDays);
      stability =
        FSRS_W[11] *
        Math.pow(difficulty, -FSRS_W[12]) *
        (Math.pow(stability + 1, FSRS_W[13]) - 1) *
        Math.exp(FSRS_W[14] * (1 - r));
      repetition = 0;
    } else {
      // Successful recall: growth modulated by difficulty and retrievability.
      const r = fsrsRetrievability(stability, elapsedDays);
      const bonus =
        grade === 2 ? FSRS_W[15] : grade === 4 ? FSRS_W[16] : 1;
      stability =
        stability *
        (1 +
          Math.exp(FSRS_W[8]) *
            (11 - difficulty) *
            Math.pow(stability, -FSRS_W[9]) *
            (Math.exp((1 - r) * FSRS_W[10]) - 1) *
            bonus);
      repetition += 1;
    }
    stability = clampF(stability, 0.1, 36_500);
    difficulty = fsrsNextDifficulty(difficulty, grade);

    // Requested retention ≈ 90% → interval ≈ stability days at these params.
    const interval = Math.max(grade === 1 ? 0 : 1, Math.round(stability));

    return {
      easeFactor: fsrsPseudoEase(difficulty),
      interval,
      repetition,
      nextReview: new Date(Date.now() + interval * DAY_MS).toISOString(),
      lastReview: nowISO(),
      quality,
      stability: Math.round(stability * 100) / 100,
      difficulty: Math.round(difficulty * 100) / 100,
    };
  },
};

/* ─── Active scheduler ───
 * SM-2 remains the default. FSRS is opt-in via Settings-free flag:
 *   localStorage.setItem("noska_scheduler", "fsrs")
 * Swapping migrates every card on its next review — no UI changes. */

export const activeScheduler: Scheduler = SM2Scheduler;
export type SchedulerName = "sm2" | "fsrs";

const SCHEDULER_KEY = "noska_scheduler";

export function getActiveScheduler(): Scheduler {
  try {
    return localStorage.getItem(SCHEDULER_KEY) === "fsrs" ? FSRSScheduler : SM2Scheduler;
  } catch {
    return SM2Scheduler;
  }
}

export function setPreferredScheduler(name: SchedulerName): void {
  try {
    if (name === "fsrs") localStorage.setItem(SCHEDULER_KEY, "fsrs");
    else localStorage.removeItem(SCHEDULER_KEY);
  } catch { /* storage unavailable */ }
}

export function preferredSchedulerName(): SchedulerName {
  return getActiveScheduler().name as SchedulerName;
}

/* ─── Shared helpers (the ONLY writers of block.review metadata) ─── */

/** State for "Add to review" — due immediately. Uses the user's preferred
 * scheduler so cards are born in the right memory model. */
export function createReviewState(scheduler: Scheduler = getActiveScheduler()): ScheduledReviewState {
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
