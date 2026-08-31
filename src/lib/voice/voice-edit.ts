/**
 * Noska AI Voice Edit Engine
 * 
 * Voice-driven text editing: the user highlights text, speaks an instruction
 * (e.g. "make this more concise", "translate to Spanish", "turn into bullets"),
 * and the engine returns the edited replacement text.
 * 
 * Pairs with dictation-cleanup.ts (dictation) to form the complete voice AI pipeline.
 */

import { aiManager } from "../../ai/AIManager";
import type { ToneSetting, TargetApp } from "./dictation-cleanup";
import { detectTargetApp, logVoicePair, VOICE_EDIT_TIMEOUT_MS } from "./dictation-cleanup";

// ─── Types ────────────────────────────────────────────────────────

export interface VoiceEditRequest {
  selectedText: string;
  instruction: string;
  targetApp?: TargetApp;
  toneSetting?: ToneSetting;
}

export interface VoiceEditResult {
  editedText: string;
  wasAIEdited: boolean;
  instruction: string;
  timedOut?: boolean;
}

// ─── System Prompt Builder ────────────────────────────────────────

function buildVoiceEditSystemPrompt(
  targetApp: TargetApp,
  toneSetting: ToneSetting
): string {
  return `You are a voice-driven text editor. The user has highlighted a block of text in some application and spoken an instruction describing how to change it. You receive the selected text and the spoken instruction, and you return only the edited replacement text.

INPUT CONTEXT:
- target_app: "${targetApp}"
- tone_setting: "${toneSetting}"

WHAT TO DO:
1. Apply the instruction precisely. Do not perform additional edits the user didn't ask for.
2. Preserve the original meaning and any facts, names, numbers, or links in selected_text unless the instruction explicitly asks to change them.
3. If the instruction is a format change (bullets, paragraph, table), restructure without altering the substance of the content.
4. If the instruction is a tone/length change, adjust prose style but keep it recognizably the same content.
5. If the instruction is ambiguous or cannot be meaningfully applied to selected_text, return selected_text unchanged rather than guessing.
6. Match target_app formatting conventions (e.g. plain text for Slack, markdown for Notion, no markdown for plain email clients unless HTML email is implied).

OUTPUT: Return only the replacement text for the selection. No preamble, no explanation, no meta-commentary about what you changed.`;
}

// ─── Default Tone Mapping ─────────────────────────────────────────

function defaultToneForApp(app: TargetApp): ToneSetting {
  switch (app) {
    case "chat": return "casual";
    case "email": return "professional";
    case "docs": return "neutral";
    case "code": return "neutral";
    case "unknown": return "neutral";
  }
}

// ─── Voice Edit Engine ────────────────────────────────────

/**
 * Apply a spoken editing instruction to selected text using AI.
 * 
 * @example
 * const result = await voiceEdit({
 *   selectedText: "The meeting is scheduled for tomorrow at 3pm.",
 *   instruction: "make it more formal",
 *   targetApp: "email",
 * });
 * // result.editedText → "The meeting has been scheduled for tomorrow at 3:00 PM."
 */
export async function voiceEdit(
  request: VoiceEditRequest
): Promise<VoiceEditResult> {
  const { selectedText, instruction } = request;

  // Guard: empty input
  if (!selectedText?.trim() || !instruction?.trim()) {
    return {
      editedText: selectedText || "",
      wasAIEdited: false,
      instruction: instruction || "",
    };
  }

  const targetApp = request.targetApp || "docs";
  const toneSetting = request.toneSetting || defaultToneForApp(targetApp);

  const systemPrompt = buildVoiceEditSystemPrompt(targetApp, toneSetting);
  const userPrompt = `SELECTED TEXT:\n${selectedText}\n\nINSTRUCTION:\n${instruction}`;

  // Low-latency UX: timeout to prevent blocking user input
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VOICE_EDIT_TIMEOUT_MS);

  try {
    const result = await aiManager.send({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1500,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Strip accidental wrapping quotes the LLM may add
    let edited = result?.trim() || "";
    if (
      (edited.startsWith('"') && edited.endsWith('"')) ||
      (edited.startsWith("'") && edited.endsWith("'")) ||
      (edited.startsWith("`") && edited.endsWith("`"))
    ) {
      edited = edited.slice(1, -1);
    }

    // Log instruction -> output pair for fine-tuning (consent-gated)
    logVoicePair({
      timestamp: Date.now(),
      type: "edit",
      input: selectedText,
      output: edited || selectedText,
      instruction,
      tone: toneSetting,
      targetApp,
    });

    return {
      editedText: edited || selectedText,
      wasAIEdited: true,
      instruction,
    };
  } catch {
    clearTimeout(timeoutId);
    // Hard word-for-word fallback: return original selected text unchanged
    return {
      editedText: selectedText,
      wasAIEdited: false,
      instruction,
      timedOut: true,
    };
  }
}

/**
 * Quick instruction classifier — determines if a spoken phrase is an
 * editing instruction vs. new dictation content.
 * 
 * Used by the voice controller to decide whether to route to voiceEdit()
 * or cleanDictation() when there's an active text selection.
 */
export function looksLikeEditInstruction(text: string): boolean {
  if (!text?.trim()) return false;
  const lower = text.trim().toLowerCase();

  const editPatterns = [
    /^make (this|it|that)\b/,
    /^(change|convert|turn|transform|switch|rewrite|rephrase|reword)\b/,
    /^(translate|shorten|expand|simplify|summarize|summarise)\b/,
    /^(fix|correct|improve|polish|refine|clean up|tidy)\b/,
    /^(add|remove|delete|insert|replace|swap|move)\b/,
    /^(capitalize|uppercase|lowercase|bold|italicize|underline)\b/,
    /^(format|restructure|reorganize|rearrange)\b/,
    /\b(more formal|more casual|more concise|more detailed|more professional)\b/,
    /\b(into bullet|into a list|into a table|into a paragraph|into markdown)\b/,
    /\b(to spanish|to french|to german|to japanese|to chinese|to hindi|to korean)\b/,
    /\b(sound better|sound more|less wordy|more punchy)\b/,
  ];

  return editPatterns.some(pattern => pattern.test(lower));
}
