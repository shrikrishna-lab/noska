import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Brain,
  X,
  RotateCcw,
  Flame,
  Trophy,
  Zap,
  Clock,
  Check,
  Eye,
  EyeOff,
  Undo2,
  SkipForward,
  PauseCircle,
  Trash2
} from "lucide-react";
import {
  getActiveScheduler,
  isBlockDue,
  preferredSchedulerName,
  removedReviewState,
  setPreferredScheduler,
  type ReviewState
} from "./scheduler";
import { cardSides } from "../study/studyCards";
import LearningAnalytics from "../study/LearningAnalytics";

/* ─── Rating buttons ─── */

const RATINGS = [
  { quality: 1, label: "Again", color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20", key: "1" },
  { quality: 3, label: "Hard", color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20", key: "2" },
  { quality: 4, label: "Good", color: "text-[var(--success)]", bg: "bg-[var(--success)]/10 hover:bg-[var(--success)]/20", key: "3" },
  { quality: 5, label: "Easy", color: "text-[var(--noska-blue)]", bg: "bg-[var(--noska-blue)]/10 hover:bg-[var(--noska-blue)]/20", key: "4" }
];

/* ─── main component ─── */

interface QueueItem {
  block: { id: string; text?: string; review?: ReviewState; study?: { answer?: string } };
  pageId: string;
  pageTitle: string;
}

export default function SpacedRepetition({ pages, onBlockPatch, onClose, onToast }: {
  pages: Array<{ id: string; title?: string; trashed?: boolean; blocks?: Array<Record<string, unknown>> }>;
  onBlockPatch: (pageId: string, blockId: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
  onToast?: (message: string) => void;
}) {
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [view, setView] = useState("review"); // "review" | "dashboard" | "insights"
  const [, forceTick] = useState(0); // re-render after scheduler preference change

  /* ── Session queue ──
   * Snapshot of due cards taken when the modal opens (and re-synced until
   * the user's first action). Frozen afterwards so rating/suspending a card
   * can't reshuffle indices mid-session via parent re-renders — this fixes
   * the latent index-shift bug where a rated card dropping out of `pages`
   * pulled the next card forward AND index+1 skipped it. */
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const touchedRef = useRef(false);

  useEffect(() => {
    if (touchedRef.current) return;
    const cards: QueueItem[] = [];
    for (const page of pages) {
      if (page.trashed) continue;
      for (const raw of page.blocks || []) {
        const block = raw as { id: string; text?: string; review?: ReviewState; study?: { answer?: string } };
        if (block.review && isBlockDue(block)) {
          cards.push({ block, pageId: page.id, pageTitle: page.title || "Untitled" });
        }
      }
    }
    setQueue(cards);
  }, [pages]);

  const allReviewableCards = useMemo(() => {
    const cards: QueueItem[] = [];
    let suspended = 0;
    for (const page of pages) {
      if (page.trashed) continue;
      for (const raw of page.blocks || []) {
        const block = raw as { id: string; text?: string; review?: ReviewState; study?: { answer?: string } };
        if (!block.review) continue;
        if (block.review.suspended) { suspended += 1; continue; }
        cards.push({ block, pageId: page.id, pageTitle: page.title || "Untitled" });
      }
    }
    return { cards, suspended };
  }, [pages]);

  const currentCard = queue[cardIndex];
  const isComplete = cardIndex >= queue.length;

  /* ── Undo history: previous review states of rated cards ── */
  const historyRef = useRef<Array<{ item: QueueItem; prevReview: ReviewState; wasCorrect: boolean }>>([]);

  const handleRate = useCallback((quality: number) => {
    if (!currentCard) return;
    const prevReview = currentCard.block.review ?? {};
    historyRef.current.push({ item: currentCard, prevReview, wasCorrect: quality >= 3 });
    touchedRef.current = true;
    onBlockPatch(currentCard.pageId, currentCard.block.id, getActiveScheduler().schedule(prevReview, quality));
    setSessionStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (quality >= 3 ? 1 : 0) }));
    setShowAnswer(false);
    setCardIndex((i) => i + 1);
  }, [currentCard, onBlockPatch]);

  /** Restore the last rated card to its pre-rating state and return to it. */
  const undoLast = useCallback(() => {
    const entry = historyRef.current.pop();
    if (!entry) return;
    onBlockPatch(entry.item.pageId, entry.item.block.id, entry.prevReview as Record<string, unknown>);
    setSessionStats((s) => ({
      reviewed: Math.max(0, s.reviewed - 1),
      correct: Math.max(0, s.correct - (entry.wasCorrect ? 1 : 0))
    }));
    setShowAnswer(false);
    setCardIndex((i) => Math.max(0, i - 1));
  }, [onBlockPatch]);

  /** Advance without scheduling — card keeps its current state. */
  const skipCard = useCallback(() => {
    if (!currentCard) return;
    touchedRef.current = true;
    setShowAnswer(false);
    setCardIndex((i) => i + 1);
  }, [currentCard]);

  /** Park a card: leaves the due queue but keeps its scheduling history. */
  const suspendCard = useCallback(() => {
    if (!currentCard) return;
    touchedRef.current = true;
    onBlockPatch(currentCard.pageId, currentCard.block.id, {
      ...(currentCard.block.review ?? {}),
      suspended: true
    });
    onToast?.("Card suspended — find it again via Remove from review → re-add");
    setShowAnswer(false);
    setCardIndex((i) => i + 1);
  }, [currentCard, onBlockPatch, onToast]);

  /** Strip review metadata entirely. */
  const removeCard = useCallback(() => {
    if (!currentCard) return;
    touchedRef.current = true;
    onBlockPatch(currentCard.pageId, currentCard.block.id, removedReviewState());
    onToast?.("Removed from review queue");
    setShowAnswer(false);
    setCardIndex((i) => i + 1);
  }, [currentCard, onBlockPatch, onToast]);

  const restartSession = useCallback(() => {
    historyRef.current = [];
    touchedRef.current = false; // allow queue re-sync from pages
    setCardIndex(0);
    setSessionStats({ reviewed: 0, correct: 0 });
  }, []);

  /* ─── Keyboard shortcuts ───
     Space/Enter reveal · 1–4 rate · U undo · S skip · Esc close */
  useEffect(() => {
    const onKey = (e: React.KeyboardEvent | KeyboardEvent) => {
      if ((e as KeyboardEvent).key === "Escape") {
        onClose();
        return;
      }
      if (isComplete) return;
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        return;
      }
      if (showAnswer) {
        const rating = RATINGS.find((r) => r.key === (e as KeyboardEvent).key);
        if (rating) {
          e.preventDefault();
          handleRate(rating.quality);
          return;
        }
      }
      const k = (e as KeyboardEvent).key.toLowerCase();
      if (k === "u" && historyRef.current.length > 0) { e.preventDefault(); undoLast(); }
      else if (k === "s") { e.preventDefault(); skipCard(); }
    };
    window.addEventListener("keydown", onKey as unknown as EventListener);
    return () => window.removeEventListener("keydown", onKey as unknown as EventListener);
  }, [showAnswer, isComplete, handleRate, undoLast, skipCard, onClose]);

  /* ─── Stats ─── */
  const totalCards = allReviewableCards.cards.length;
  const mastery = totalCards > 0
    ? Math.round((allReviewableCards.cards.filter((c) => (c.block.review?.repetition ?? 0) >= 3).length / totalCards) * 100)
    : 0;

  const streak = allReviewableCards.cards.filter((c) => {
    const lastReview = c.block.review?.lastReview;
    if (!lastReview) return false;
    const diff = Date.now() - new Date(lastReview).getTime();
    return diff < 86400000 * 2; // Reviewed in last 2 days
  }).length;

  const retention = sessionStats.reviewed > 0
    ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[520px] max-w-full flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Brain size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Review</h2>
          <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-0.5">
            <button
              onClick={() => setView("review")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${view === "review" ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)]"}`}
            >
              Cards
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${view === "dashboard" ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)]"}`}
            >
              Stats
            </button>
            <button
              onClick={() => setView("insights")}
              className={`rounded-md px-3 py-1 text-xs font-medium ${view === "insights" ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)]"}`}
            >
              Insights
            </button>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {view === "insights" ? (
          /* Learning analytics */
          <div className="p-5">
            <LearningAnalytics pages={pages} />
          </div>
        ) : view === "dashboard" ? (
          /* Dashboard */
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Brain} label="Total Cards" value={totalCards} color="text-[var(--accent)]" />
              <StatCard icon={Clock} label="Due Now" value={queue.length} color="text-[var(--accent)]" />
              <StatCard icon={Trophy} label="Mastery" value={`${mastery}%`} color="text-[var(--success)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Flame} label="Streak" value={streak} color="text-[var(--warning)]" />
              <StatCard icon={Zap} label="Reviewed Today" value={sessionStats.reviewed} color="text-[var(--noska-blue)]" />
            </div>
            {sessionStats.reviewed > 0 && (
              <StatCard icon={Check} label="Retention (this session)" value={`${retention}%`} color="text-[var(--success)]" />
            )}
            {allReviewableCards.suspended > 0 && (
              <p className="text-xs text-[var(--muted)] text-center">{allReviewableCards.suspended} card(s) suspended</p>
            )}
            {/* Scheduler preference — applies from each card's next rating. */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <div>
                <div className="text-[11px] font-semibold text-[var(--text)]">Scheduling algorithm</div>
                <div className="text-[9px] text-[var(--muted)]">Cards migrate automatically on their next review</div>
              </div>
              <select
                value={preferredSchedulerName()}
                onChange={(e) => {
                  setPreferredScheduler(e.target.value as "sm2" | "fsrs");
                  forceTick((t) => t + 1);
                }}
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px] text-[var(--text)] focus:outline-none"
              >
                <option value="sm2">SM-2 (classic)</option>
                <option value="fsrs">FSRS-4.5 (modern)</option>
              </select>
            </div>
            {totalCards === 0 && (
              <div className="text-center py-6 text-sm text-[var(--muted)]">
                No cards yet. Right-click any block → “Add to review”, or type /review in the editor.
              </div>
            )}
          </div>
        ) : (
          /* Review cards */
          <div className="p-6 min-h-[300px] flex flex-col">
            {isComplete ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mb-4 text-5xl"
                >
                  {sessionStats.reviewed === 0 ? "📭" : "🎉"}
                </motion.div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                  {sessionStats.reviewed === 0 ? "No cards due" : "Session complete!"}
                </h3>
                <p className="text-sm text-[var(--secondary)]">
                  {sessionStats.reviewed === 0
                    ? `${totalCards} cards total · All caught up`
                    : `Reviewed ${sessionStats.reviewed} cards · ${sessionStats.correct} correct${sessionStats.reviewed > 0 ? ` · ${retention}% retention` : ""}`}
                </p>
                {historyRef.current.length > 0 && (
                  <button
                    onClick={() => { while (historyRef.current.length) undoLast(); }}
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]"
                  >
                    <Undo2 size={13} />
                    Undo session ({historyRef.current.length})
                  </button>
                )}
                <button
                  onClick={restartSession}
                  className="mt-4 flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <RotateCcw size={13} />
                  Review again
                </button>
              </div>
            ) : (
              <>
                {/* Progress */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-1 rounded-full bg-[var(--surface)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${((cardIndex + 1) / queue.length) * 100}%` }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    />
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {cardIndex + 1}/{queue.length}
                  </span>
                  {historyRef.current.length > 0 && (
                    <button
                      onClick={undoLast}
                      title="Undo last answer (U)"
                      className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] cursor-pointer"
                    >
                      <Undo2 size={11} />
                      Undo
                    </button>
                  )}
                </div>

                {/* Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCard.block.id + ":" + cardIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={SPRING_PRESETS.soft}
                    className="flex-1 flex flex-col"
                  >
                    <div className="text-[10px] font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">
                      {currentCard.pageTitle}
                    </div>

                    {/* Question side — cloze-aware: {{answers}} render as [ … ] until reveal */}
                    <div className="flex-1 flex items-center justify-center rounded-xl bg-[var(--surface)] p-6 min-h-[120px]">
                      <p className="text-center text-base leading-7 text-[var(--text)]">
                        {cardSides(currentCard.block).front || "(Empty block)"}
                      </p>
                    </div>

                    {/* Answer side — shown after reveal when the card has a
                        distinct back (cloze reveal or study.answer) */}
                    {showAnswer && (() => {
                      const sides = cardSides(currentCard.block);
                      const hasBack = sides.isCloze || Boolean(currentCard.block.study?.answer);
                      if (!hasBack || sides.back === sides.front) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/[0.06] p-4"
                        >
                          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Answer</div>
                          <p className="text-sm leading-6 text-[var(--text)]">{sides.back}</p>
                        </motion.div>
                      );
                    })()}

                    {/* Show answer / Rate */}
                    <div className="mt-4">
                      {!showAnswer ? (
                        <motion.button
                          onClick={() => setShowAnswer(true)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm"
                        >
                          {showAnswer ? <EyeOff size={15} /> : <Eye size={15} />}
                          Show Answer
                          <span className="text-xs opacity-60 ml-1">Space</span>
                        </motion.button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div className="text-center text-xs text-[var(--muted)] mb-2">How well did you recall?</div>
                          <div className="grid grid-cols-4 gap-2">
                            {RATINGS.map((r) => (
                              <motion.button
                                key={r.quality}
                                onClick={() => handleRate(r.quality)}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs font-medium transition-colors ${r.bg} ${r.color}`}
                              >
                                {r.label}
                                <span className="text-[10px] opacity-60">{r.key}</span>
                              </motion.button>
                            ))}
                          </div>
                          {/* Card actions */}
                          <div className="flex items-center justify-center gap-4 pt-1">
                            <button
                              onClick={skipCard}
                              title="Skip (S)"
                              className="flex items-center gap-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                            >
                              <SkipForward size={11} /> Skip
                            </button>
                            <button
                              onClick={suspendCard}
                              title="Suspend — hides card from queue, keeps history"
                              className="flex items-center gap-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                            >
                              <PauseCircle size={11} /> Suspend
                            </button>
                            <button
                              onClick={removeCard}
                              title="Remove from review entirely"
                              className="flex items-center gap-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer"
                            >
                              <Trash2 size={11} /> Remove
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Stat Card ─── */

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
