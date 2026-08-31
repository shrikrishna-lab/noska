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

  for (let i = rollingBuffer.length - 1; i >= 0; i--) {
    if (rollingBuffer[i].targetElement === target || document.body.contains(rollingBuffer[i].targetElement)) {
      return rollingBuffer[i];
    }
  }
  return rollingBuffer[rollingBuffer.length - 1] || null;
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
  const replacementText = isDelete ? "" : correctionText;

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
