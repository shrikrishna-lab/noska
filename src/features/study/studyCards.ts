/* ─── Study cards — shared model ───
 *
 * A study card is an ordinary text block plus two metadata objects:
 *   * `study`  — presentation/learning metadata (type, difficulty, origin,
 *                answer). The original content is never destroyed; the
 *                question lives in `text`, the answer inside `study`.
 *   * `review` — spaced-repetition scheduling state written ONLY through
 *                src/features/spaced/scheduler.ts helpers.
 *
 * Both the AI generator and the review UI render from this module so
 * cloze syntax and card shapes cannot diverge between them.
 */

import { uid, blockFor } from "../../utils/helpers";
import { createReviewState } from "../spaced/scheduler";

export type StudyCardType = "flashcard" | "cloze" | "question";
export type StudyDifficulty = "beginner" | "intermediate" | "advanced";

export interface StudyMeta {
  type: StudyCardType;
  /** Hidden side of the card. Absent → the front doubles as the answer. */
  answer?: string;
  difficulty?: StudyDifficulty;
  origin: "ai-generated" | "manual";
  createdAt: string;
}

export interface GeneratedCard {
  type: StudyCardType;
  front: string;
  answer: string;
}

/** Block shape produced by makeStudyBlock / accepted by the review UI. */
export interface StudyCardBlock {
  id: string;
  type: "text";
  text: string;
  study: StudyMeta;
  review: ReturnType<typeof createReviewState>;
}

/* ─── Cloze syntax: {{answer}} or {{c1::answer}} ─── */

const CLOZE_PATTERN = /\{\{(?:c\d+::)?([^{}]+)\}\}/g;

export function hasCloze(text: string): boolean {
  return /\{\{(?:c\d+::)?[^{}]+\}\}/.test(text);
}

export function clozeCount(text: string): number {
  const matches = text.match(CLOZE_PATTERN);
  return matches ? matches.length : 0;
}

/** Front side shown before reveal — every cloze becomes [ … ]. */
export function blankCloze(text: string): string {
  return text.replace(CLOZE_PATTERN, "[ … ]");
}

/** Back side shown after reveal — cloze markers stripped, answers kept. */
export function revealCloze(text: string): string {
  return text.replace(CLOZE_PATTERN, "$1");
}

/** What the reviewer sees on each side of any card. */
export function cardSides(block: { text?: string; study?: { answer?: string } }): {
  front: string;
  back: string;
  isCloze: boolean;
} {
  const raw = typeof block.text === "string" ? block.text : "";
  const isCloze = hasCloze(raw);
  if (isCloze) {
    return { front: blankCloze(raw), back: revealCloze(raw), isCloze: true };
  }
  const answer = block.study?.answer;
  if (typeof answer === "string" && answer.trim()) {
    return { front: raw, back: answer.trim(), isCloze: false };
  }
  // Plain card: the whole text is both sides (recall prompt).
  return { front: raw, back: raw, isCloze: false };
}

/* ─── Factories ─── */

export function makeStudyBlock(
  card: GeneratedCard,
  opts: { difficulty?: StudyDifficulty; scheduler?: Parameters<typeof createReviewState>[0] } = {},
): StudyCardBlock {
  // blockFor("text") yields a proper paragraph block (richText shape the
  // editor expects) — we only bolt on study/review metadata.
  const base = blockFor("text", card.front) as unknown as StudyCardBlock;
  base.id = uid();
  base.study = {
    type: card.type,
    ...(card.answer.trim() ? { answer: card.answer.trim() } : {}),
    ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    origin: "ai-generated",
    createdAt: new Date().toISOString(),
  };
  // Due immediately, same as right-click → Add to review.
  base.review = createReviewState(opts.scheduler);
  return base;
}

/** Heading + cards appended as one atomic group. */
export function studySectionBlocks(cards: GeneratedCard[], difficulty?: StudyDifficulty): Array<Record<string, unknown>> {
  return [
    blockFor("h2", "Study Cards"),
    ...cards.map((c) => makeStudyBlock(c, { difficulty }) as unknown as Record<string, unknown>),
  ];
}
