import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Sparkles,
  X,
  Loader2,
  Check,
  RefreshCw,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { runAI } from "../../utils/ai";
import type { Page } from "../../lib/supabaseService";
import {
  studySectionBlocks,
  clozeCount,
  cardSides,
  type GeneratedCard,
  type StudyCardType,
  type StudyDifficulty,
} from "./studyCards";

const COUNT_OPTIONS = [5, 10, 20];
const DIFFICULTY_OPTIONS: Array<{ id: StudyDifficulty; label: string }> = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

/** Max source characters sent for generation — keeps requests fast and
 * focused on the page's actual substance. */
const SOURCE_LIMIT = 6000;

function pageSourceText(page: Page): string {
  const parts: string[] = [page.title || "Untitled"];
  for (const b of page.blocks ?? []) {
    const text = typeof b.text === "string" ? b.text.trim() : "";
    if (!text) continue;
    // Skip previously generated cards so re-generation doesn't feed on itself.
    if ((b.study as { origin?: string } | undefined)?.origin) continue;
    parts.push(text);
    if (parts.join("\n").length > SOURCE_LIMIT) break;
  }
  return parts.join("\n").slice(0, SOURCE_LIMIT);
}

function buildPrompt(source: string, count: number, difficulty: StudyDifficulty): string {
  return `You create high-quality spaced-repetition study cards.

SOURCE CONTENT:
"""
${source}
"""

Create exactly ${count} study cards at ${difficulty} level.
Rules:
- Test understanding, not sentence copying. Prefer "why/how/compare/what happens if" questions.
- No trivial cards (dates alone, definitions that just repeat a phrase).
- Use these types:
  - "flashcard": front is a question, answer is a concise complete answer.
  - "cloze": front contains one or more {{cloze}} deletions around KEY terms, answer repeats the full sentence with terms visible.
  - "question": deeper exam/interview-style question requiring reasoning.
- Mix roughly: half flashcard, a quarter cloze, a quarter question. Adjust to what the content supports.
- Front must be self-contained (no "this page" references).

Respond with ONLY a JSON array, no markdown fences, no commentary:
[{"type":"flashcard","front":"...","answer":"..."},{"type":"cloze","front":"The OSI layer {{data link}} handles framing.","answer":"The OSI layer data link handles framing."}]`;
}

/** Robust JSON array extraction — models sometimes wrap in fences or prose. */
function parseCards(raw: string): GeneratedCard[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("Model returned no card list.");
  let arr: unknown;
  try {
    arr = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Model returned malformed JSON.");
  }
  if (!Array.isArray(arr)) throw new Error("Expected a JSON array of cards.");
  const VALID: StudyCardType[] = ["flashcard", "cloze", "question"];
  const cards: GeneratedCard[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const type = VALID.includes(o.type as StudyCardType) ? (o.type as StudyCardType) : "flashcard";
    const front = typeof o.front === "string" ? o.front.trim() : "";
    const answer = typeof o.answer === "string" ? o.answer.trim() : "";
    if (!front) continue;
    if (type === "cloze" && clozeCount(front) === 0) continue; // broken cloze
    cards.push({ type, front, answer });
  }
  if (cards.length === 0) throw new Error("No usable cards in model output.");
  return cards;
}

export default function AIFlashcardGenerator({ page, onBlocks, apiKey, aiProvider, nvidiaKey, onClose, onToast }: {
  page: Page;
  /** Receives the FULL next block array including existing content. */
  onBlocks: (blocks: unknown[]) => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onClose: () => void;
  onToast?: (message: string) => void;
}) {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<StudyDifficulty>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedCard[] | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const hasKey = Boolean(
    (aiProvider === "nvidia" ? nvidiaKey : apiKey) ||
    (!aiProvider && (apiKey || nvidiaKey))
  );

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    setExcluded(new Set());
    try {
      const source = pageSourceText(page);
      if (source.length < 60) {
        throw new Error("This page has too little content to study yet — write a bit more first.");
      }
      const raw = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey,
        system: "You are an expert learning scientist who writes precise spaced-repetition flashcards. Output strict JSON only.",
        prompt: buildPrompt(source, count, difficulty),
      });
      const cards = parseCards(raw);
      setGenerated(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [page, count, difficulty, aiProvider, apiKey, nvidiaKey]);

  const selectedCards = useMemo(
    () => (generated ?? []).filter((_, i) => !excluded.has(i)),
    [generated, excluded],
  );

  const save = () => {
    if (!selectedCards.length) return;
    setSaving(true);
    try {
      onBlocks([...(page.blocks ?? []), ...studySectionBlocks(selectedCards, difficulty)]);
      onToast?.(`Added ${selectedCards.length} card${selectedCards.length === 1 ? "" : "s"} — they're due in your review queue now`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[560px] max-w-full h-[min(640px,calc(100vh-32px))] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 shrink-0">
          <GraduationCap size={18} className="text-[var(--accent)]" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[var(--text)]">Generate study cards</h2>
            <p className="truncate text-[11px] text-[var(--muted)]">from “{page.title || "Untitled"}”</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {!hasKey ? (
          /* Missing-key state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle size={22} className="text-[var(--warning)]" />
            <p className="text-sm font-medium text-[var(--text)]">AI isn't configured</p>
            <p className="max-w-xs text-xs leading-relaxed text-[var(--secondary)]">
              Add your Claude or NVIDIA key in Settings → Noska AI to generate cards from this page.
            </p>
            <button onClick={onClose} className="mt-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]">
              Close
            </button>
          </div>
        ) : generated ? (
          /* Preview */
          <>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-2.5 shrink-0">
              <span className="text-xs text-[var(--secondary)]">
                {selectedCards.length} of {generated.length} selected · saved cards enter the review queue immediately
              </span>
              <button
                onClick={generate}
                disabled={generating}
                className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] disabled:opacity-50"
              >
                {generating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Regenerate
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {generated.map((card, i) => {
                const on = !excluded.has(i);
                const sides = card.type === "cloze"
                  ? { front: cardSides({ text: card.front }).front, back: cardSides({ text: card.front }).back }
                  : { front: card.front, back: card.answer };
                return (
                  <button
                    key={i}
                    onClick={() => setExcluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })}
                    className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                      on ? "border-[var(--border-strong)] bg-[var(--surface)]" : "border-[var(--border)] bg-transparent opacity-45"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`grid h-4 w-4 place-items-center rounded border ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--muted)]"}`}>
                        {on && <Check size={10} />}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        card.type === "cloze"
                          ? "bg-[var(--noska-blue-soft)] text-[var(--noska-blue)]"
                          : card.type === "question"
                          ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                          : "bg-[var(--accent)]/10 text-[var(--accent)]"
                      }`}>
                        {card.type}
                      </span>
                      <span className="truncate text-[10px] text-[var(--muted)]">{sides.back}</span>
                    </div>
                    <p className="pl-6 text-xs leading-relaxed text-[var(--text)]">{sides.front}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3.5 shrink-0">
              <span className="text-[10px] text-[var(--muted)]">Original page content stays untouched.</span>
              <button
                onClick={save}
                disabled={saving || selectedCards.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Add {selectedCards.length} card{selectedCards.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        ) : (
          /* Options + generate */
          <div className="flex flex-1 flex-col p-5">
            <OptionRow label="How many cards">
              <div className="flex gap-1.5">
                {COUNT_OPTIONS.map((n) => (
                  <ChoiceChip key={n} active={count === n} onClick={() => setCount(n)}>{n}</ChoiceChip>
                ))}
              </div>
            </OptionRow>
            <OptionRow label="Difficulty">
              <div className="flex gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <ChoiceChip key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)}>{d.label}</ChoiceChip>
                ))}
              </div>
            </OptionRow>

            <div className="mt-4 rounded-lg bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--secondary)]">
              Noska reads this page and writes questions that test understanding — flashcards, cloze deletions and exam-style questions. You preview everything before anything is saved.
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 text-xs text-[var(--danger)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-auto pt-4">
              <motion.button
                onClick={generate}
                disabled={generating}
                whileHover={{ scale: generating ? 1 : 1.01 }}
                whileTap={{ scale: generating ? 1 : 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? "Reading your page…" : `Generate ${count} cards`}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-[var(--secondary)]">{label}</span>
      {children}
    </div>
  );
}

function ChoiceChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
          : "border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)]"
      }`}
    >
      {children}
    </button>
  );
}
