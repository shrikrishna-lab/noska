/**
 * Noska AI — Rewind Engine (Signature Voice Self-Correction)
 * 
 * Hands-free, selection-free voice self-correction.
 * Keeps a rolling buffer of recent dictated utterances with exact insertion
 * boundaries in active inputs. When the user speaks a natural self-correction
 * ("wait, I meant...", "no, actually...", "scratch that, make it...", "correction:...", "actually..."),
 * Rewind silently replaces the previous utterance in-place with zero mouse/keyboard actions.
 */

import { getActiveTypingElement } from "./active-input";
import { getVoiceSettings } from "./voice-settings";

// ─── Types ────────────────────────────────────────────────────────

export interface RewindUtterance {
  id: string;
  timestamp: number;
  text: string;
  targetElement: HTMLElement;
  charStart: number;
  charEnd: number;
  prefix: string;
  suffix: string;
}

export interface RewindMatchResult {
  isRewind: boolean;
  isDelete: boolean;
  correctionText: string;
  matchedTrigger: string;
}

export interface RewindEvent {
  originalText: string;
  replacementText: string;
  isDelete: boolean;
  timestamp: number;
}

// ─── Rolling Utterance Buffer ────────────────────────────────────

const MAX_UTTERANCES = 10;
const rollingBuffer: RewindUtterance[] = [];
const rewindListeners = new Set<(event: RewindEvent) => void>();

/**
 * Record a freshly inserted utterance into the rolling buffer
 */
export function recordUtterance(
  targetElement: HTMLElement,
  text: string,
  charStart: number,
  charEnd: number,
  prefix: string = "",
  suffix: string = ""
): void {
  if (!text || !text.trim()) return;

  const utterance: RewindUtterance = {
    id: `utt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    text: text.trim(),
    targetElement,
    charStart,
    charEnd,
    prefix,
    suffix,
  };

  rollingBuffer.push(utterance);
  if (rollingBuffer.length > MAX_UTTERANCES) {
    rollingBuffer.shift();
  }
}

/**
 * Get the latest recorded utterance for an element or active input
 */
export function getLastUtterance(targetElement?: HTMLElement | null): RewindUtterance | null {
  const target = targetElement || getActiveTypingElement();
  if (!target) return rollingBuffer[rollingBuffer.length - 1] || null;

  // Prefer an utterance recorded for exactly this element…
  for (let i = rollingBuffer.length - 1; i >= 0; i--) {
    if (rollingBuffer[i].targetElement === target) {
      return rollingBuffer[i];
    }
  }
  // …otherwise the most recent utterance whose element is still live
  // (dictation may have moved focus between insertion and correction).
  for (let i = rollingBuffer.length - 1; i >= 0; i--) {
    if (document.body.contains(rollingBuffer[i].targetElement)) {
      return rollingBuffer[i];
    }
  }
  return null;
}

/**
 * Clear the rolling buffer (e.g. on session end or blur)
 */
export function clearRewindBuffer(): void {
  rollingBuffer.length = 0;
}

// ─── Sub-millisecond Trigger Classifier ──────────────────────────

/**
 * Fast local regex classifier to test if a spoken utterance is a Rewind self-correction trigger.
 */
export function classifyRewindTrigger(rawSpokenText: string): RewindMatchResult {
  if (!rawSpokenText || !rawSpokenText.trim()) {
    return { isRewind: false, isDelete: false, correctionText: "", matchedTrigger: "" };
  }

  const clean = rawSpokenText.trim();
  const lower = clean.toLowerCase();

  // 1. Pure deletion triggers ("scratch that", "cancel that", "delete that", "nevermind that")
  const pureDeleteRegex = /^(?:scratch\s+that|cancel\s+that|delete\s+that|never\s*mind\s+that|erase\s+that|undo\s+that)[.,!?:;]?$/i;
  if (pureDeleteRegex.test(lower)) {
    return {
      isRewind: true,
      isDelete: true,
      correctionText: "",
      matchedTrigger: clean,
    };
  }

  // 2. Correction triggers with replacement text
  // e.g. "wait, I meant Tuesday", "no actually 5 PM", "scratch that make it Friday", "correction: tomorrow at 3"
  const correctionPatterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /^wait,?\s*(?:I\s*meant|make\s*that|make\s*it|I\s*mean)\s+(.+)$/i, name: "wait_i_meant" },
    { regex: /^no,?\s*(?:actually|wait|scratch\s*that)\s*,?\s*(.+)$/i, name: "no_actually" },
    { regex: /^scratch\s*that,?\s*(?:make\s*it|make\s*that|I\s*meant)?\s*(.+)$/i, name: "scratch_that_make_it" },
    { regex: /^correction:?\s*(.+)$/i, name: "correction" },
    { regex: /^actually,?\s*(?:I\s*meant|make\s*it|make\s*that)\s*(.+)$/i, name: "actually_i_meant" },
    { regex: /^I\s*mean,?\s*(.+)$/i, name: "i_mean" },
  ];

  for (const { regex, name } of correctionPatterns) {
    const match = clean.match(regex);
    if (match && match[1]?.trim()) {
      return {
        isRewind: true,
        isDelete: false,
        correctionText: match[1].trim(),
        matchedTrigger: name,
      };
    }
  }

  return { isRewind: false, isDelete: false, correctionText: "", matchedTrigger: "" };
}

// ─── Correction Splicing ─────────────────────────────────────────

function stripEdgePunct(token: string): string {
  return token.replace(/^[^\w$£€]+|[^\w%$£€]+$/g, "");
}

/** 0..1 similarity; numbers count as near-matches (correcting "3" → "4"). */
function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (/^\d+([.,]\d+)?$/.test(a) && /^\d+([.,]\d+)?$/.test(b)) return 0.9;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  // Small Levenshtein distance (tokens are short words)
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return 1 - prev[b.length] / max;
}

/**
 * "wait, I meant 4 PM" usually corrects a SLICE of the previous utterance
 * ("…at 3 PM"), not the whole sentence. When the correction aligns with the
 * utterance's tail tokens (exact, numeric, or near-identical words), splice
 * it into just those tokens; otherwise the correction restates everything.
 */
function spliceCorrectionIntoUtterance(originalText: string, correctionText: string): string {
  const oTokens = originalText.trim().split(/\s+/);
  const cTokens = correctionText.trim().split(/\s+/);
  if (oTokens.length === 0 || cTokens.length === 0) return correctionText;

  // Single-word correction: swap the trailing word, keeping the sentence
  // ("…send email to John" + "Jane" → "…send email to Jane"). Keeping the
  // surrounding sentence always preserves more meaning than erasing it.
  if (cTokens.length === 1) {
    return [...oTokens.slice(0, -1), correctionText].join(" ");
  }

  // Positional tail alignment ("The meeting is at 3 PM" + "4 PM"
  // → "The meeting is at 4 PM").
  if (oTokens.length > cTokens.length) {
    const start = oTokens.length - cTokens.length;
    let allMatch = true;
    let anyDiff = false;
    for (let i = 0; i < cTokens.length; i++) {
      const orig = stripEdgePunct(oTokens[start + i]).toLowerCase();
      const corr = stripEdgePunct(cTokens[i]).toLowerCase();
      const sim = tokenSimilarity(orig, corr);
      if (sim < 0.6) { allMatch = false; break; }
      if (sim < 1) anyDiff = true;
    }
    if (allMatch && anyDiff) {
      return [...oTokens.slice(0, start), correctionText].join(" ");
    }
  }

  // Fallback: the correction restates the whole utterance.
  return correctionText;
}

// ─── In-Place In-Input Rewind Execution ───────────────────────────

/**
 * Execute in-place Rewind replacement on the active element.
 * Returns true if the rewind succeeded.
 */
export function executeRewind(
  correctionResult: RewindMatchResult,
  targetOverride?: HTMLElement | null
): boolean {
  const settings = getVoiceSettings();
  if (settings.rewindEnabled === false) return false;

  const target = targetOverride || getActiveTypingElement();
  const lastUtterance = getLastUtterance(target);
  if (!lastUtterance) return false;

  const { isDelete, correctionText } = correctionResult;
  const originalText = lastUtterance.text;
  const replacementText = isDelete ? "" : spliceCorrectionIntoUtterance(originalText, correctionText);

  let success = false;

  // 1. Standard Input / TextArea
  if (
    lastUtterance.targetElement instanceof HTMLInputElement ||
    lastUtterance.targetElement instanceof HTMLTextAreaElement
  ) {
    const input = lastUtterance.targetElement;
    input.focus();

    const fullVal = input.value;
    // Find the last occurrence of originalText in the input
    const lastIdx = fullVal.lastIndexOf(originalText);

    if (lastIdx !== -1) {
      const before = fullVal.substring(0, lastIdx);
      const after = fullVal.substring(lastIdx + originalText.length);

      let inserted = replacementText;
      if (inserted && before.length > 0 && !/\s$/.test(before) && !/^[\s,.:;!?]/.test(inserted)) {
        inserted = " " + inserted;
      }

      const nextVal = (before + inserted + after).replace(/\s{2,}/g, " ");
      const nextCursor = before.length + inserted.length;

      input.value = nextVal;
      input.setSelectionRange(nextCursor, nextCursor);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Update utterance record
      lastUtterance.text = replacementText;
      success = true;
    }
  }

  // 2. ContentEditable / RichTextEditor Block
  else if (
    lastUtterance.targetElement.isContentEditable ||
    lastUtterance.targetElement.getAttribute("contenteditable") === "true"
  ) {
    const el = lastUtterance.targetElement;
    el.focus();

    const fullText = el.innerText || el.textContent || "";
    const lastIdx = fullText.lastIndexOf(originalText);

    if (lastIdx !== -1) {
      const before = fullText.substring(0, lastIdx);
      const after = fullText.substring(lastIdx + originalText.length);

      let inserted = replacementText;
      if (inserted && before.length > 0 && !/\s$/.test(before) && !/^[\s,.:;!?]/.test(inserted)) {
        inserted = " " + inserted;
      }

      const nextText = (before + inserted + after).replace(/\s{2,}/g, " ");
      el.innerText = nextText;

      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      lastUtterance.text = replacementText;
      success = true;
    }
  }

  if (success) {
    // Notify listeners for visual confidence aura in Voice Pill
    const event: RewindEvent = {
      originalText,
      replacementText,
      isDelete,
      timestamp: Date.now(),
    };
    rewindListeners.forEach((fn) => {
      try { fn(event); } catch {}
    });
  }

  return success;
}

// ─── Event Subscriptions ──────────────────────────────────────────

export function subscribeToRewindEvents(callback: (event: RewindEvent) => void): () => void {
  rewindListeners.add(callback);
  return () => rewindListeners.delete(callback);
}
