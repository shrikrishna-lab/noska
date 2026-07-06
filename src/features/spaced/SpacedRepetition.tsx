import React, { useState, useMemo, useCallback } from "react";
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
  EyeOff
} from "lucide-react";

/* ─── SM-2 Algorithm ─── */

interface ReviewState {
  easeFactor?: number;
  interval?: number;
  repetition?: number;
  nextReview?: string;
  lastReview?: string;
  quality?: number;
}

function sm2(quality: number, review: ReviewState = {}): Required<ReviewState> {
  let { easeFactor = 2.5, interval = 0, repetition = 0 } = review;

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

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetition,
    nextReview: nextReview.toISOString(),
    lastReview: new Date().toISOString(),
    quality
  };
}

/* ─── Rating buttons ─── */

const RATINGS = [
  { quality: 1, label: "Again", color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20", key: "1" },
  { quality: 3, label: "Hard", color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20", key: "2" },
  { quality: 4, label: "Good", color: "text-[var(--success)]", bg: "bg-[var(--success)]/10 hover:bg-[var(--success)]/20", key: "3" },
  { quality: 5, label: "Easy", color: "text-[var(--noska-blue)]", bg: "bg-[var(--noska-blue)]/10 hover:bg-[var(--noska-blue)]/20", key: "4" }
];

/* ─── main component ─── */

export default function SpacedRepetition({ pages, onBlockPatch, onClose, onToast }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [view, setView] = useState("review"); // "review" | "dashboard"

  // Collect all reviewable blocks across pages
  const dueCards = useMemo(() => {
    const cards = [];
    const now = new Date().toISOString();
    for (const page of pages) {
      if (page.trashed) continue;
      for (const block of page.blocks || []) {
        if (block.review) {
          // Check if due
          if (!block.review.nextReview || block.review.nextReview <= now) {
            cards.push({ block, pageId: page.id, pageTitle: page.title });
          }
        }
      }
    }
    return cards;
  }, [pages]);

  const allReviewableCards = useMemo(() => {
    const cards = [];
    for (const page of pages) {
      if (page.trashed) continue;
      for (const block of page.blocks || []) {
        if (block.review) {
          cards.push({ block, pageId: page.id, pageTitle: page.title });
        }
      }
    }
    return cards;
  }, [pages]);

  const currentCard = dueCards[cardIndex];
  const isComplete = cardIndex >= dueCards.length;

  const handleRate = useCallback((quality) => {
    if (!currentCard) return;
    const { block, pageId } = currentCard;
    const nextReview = sm2(quality, block.review);
    onBlockPatch(pageId, block.id, { review: nextReview });
    setSessionStats((s) => ({
      reviewed: s.reviewed + 1,
      correct: s.correct + (quality >= 3 ? 1 : 0)
    }));
    setShowAnswer(false);
    setCardIndex((i) => i + 1);
  }, [currentCard, onBlockPatch]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (isComplete) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        return;
      }
      if (showAnswer) {
        const rating = RATINGS.find((r) => r.key === e.key);
        if (rating) {
          e.preventDefault();
          handleRate(rating.quality);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAnswer, isComplete, handleRate, onClose]);

  // Mastery percentage
  const mastery = allReviewableCards.length > 0
    ? Math.round((allReviewableCards.filter((c) => c.block.review?.repetition >= 3).length / allReviewableCards.length) * 100)
    : 0;

  // Current streak
  const streak = allReviewableCards.filter((c) => {
    const lastReview = c.block.review?.lastReview;
    if (!lastReview) return false;
    const diff = Date.now() - new Date(lastReview).getTime();
    return diff < 86400000 * 2; // Reviewed in last 2 days
  }).length;

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
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {view === "dashboard" ? (
          /* Dashboard */
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Brain} label="Total Cards" value={allReviewableCards.length} color="text-[var(--accent)]" />
              <StatCard icon={Clock} label="Due Today" value={dueCards.length} color="text-[var(--accent)]" />
              <StatCard icon={Trophy} label="Mastery" value={`${mastery}%`} color="text-[var(--success)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Flame} label="Streak" value={streak} color="text-[var(--warning)]" />
              <StatCard icon={Zap} label="Reviewed Today" value={sessionStats.reviewed} color="text-[var(--noska-blue)]" />
            </div>
            {allReviewableCards.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--muted)]">
                No cards yet. Add blocks to review from the block menu in the editor.
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
                    ? `${allReviewableCards.length} cards total · All caught up`
                    : `Reviewed ${sessionStats.reviewed} cards · ${sessionStats.correct} correct`
                  }
                </p>
                {sessionStats.reviewed > 0 && (
                  <button
                    onClick={() => { setCardIndex(0); setSessionStats({ reviewed: 0, correct: 0 }); }}
                    className="mt-4 flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                  >
                    <RotateCcw size={13} />
                    Review again
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Progress */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-1 rounded-full bg-[var(--surface)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${((cardIndex + 1) / dueCards.length) * 100}%` }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    />
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {cardIndex + 1}/{dueCards.length}
                  </span>
                </div>

                {/* Card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCard.block.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={SPRING_PRESETS.soft}
                    className="flex-1 flex flex-col"
                  >
                    <div className="text-[10px] font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">
                      {currentCard.pageTitle}
                    </div>

                    {/* Question side */}
                    <div className="flex-1 flex items-center justify-center rounded-xl bg-[var(--surface)] p-6 min-h-[120px]">
                      <p className="text-center text-base leading-7 text-[var(--text)]">
                        {currentCard.block.text || "(Empty block)"}
                      </p>
                    </div>

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

function StatCard({ icon: Icon, label, value, color }) {
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
