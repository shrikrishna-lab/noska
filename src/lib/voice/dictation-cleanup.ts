/**
 * Noska AI Dictation Cleanup Engine
 * 
 * Real-time AI-powered speech-to-text cleanup that produces polished text
 * ready to insert directly into the user's active context.
 * 
 * Supports multiple tone settings, target app conventions, custom dictionaries,
 * multilingual code-switching, cursor-aware continuity, and streaming cleanup.
 */

import { aiManager } from "../../ai/AIManager";
import { getVoiceSettings } from "./voice-settings";

// ─── Constants ────────────────────────────────────────────────────

/** Max time (ms) to wait for AI cleanup before falling back to raw transcript */
const CLEANUP_TIMEOUT_MS = 3_000;

/** Max time (ms) to wait for AI voice edit before falling back to original */
export const VOICE_EDIT_TIMEOUT_MS = 6_000;

/** localStorage key for voice AI fine-tuning consent */
const LOGGING_CONSENT_KEY = "noska_voice_logging_consent";
const LOGGING_STORE_KEY = "noska_voice_finetune_key";

/** Streaming cleanup debounce (ms) */
const STREAMING_DEBOUNCE_MS = 800;

/** Minimum text length to trigger AI cleanup */
const MIN_AI_CLEANUP_LENGTH = 20;

// ─── Types ────────────────────────────────────────────────────────

export type ToneSetting = 
  | "very_casual" 
  | "casual" 
  | "neutral" 
  | "professional" 
  | "formal";

export type TargetApp =
  | "chat"        // Slack, iMessage, Discord, AI chat
  | "email"       // Gmail, Outlook
  | "docs"        // Notion, Google Docs, Noska editor
  | "code"        // VS Code, terminal, code editors
  | "unknown";

export type DictationMode = "realtime" | "ai_polished" | "bullet_points" | "professional";

export interface DictationCleanupRequest {
  rawTranscript: string;
  targetApp?: TargetApp;
  toneSetting?: ToneSetting;
  customDictionary?: string[];
  language?: string;
  sourceLanguage?: string;     // source language code for translation mode (e.g. "hi-IN")
  targetLanguage?: string;     // target language code for translation mode (e.g. "en-US")
  cursorContext?: string;     // text immediately before cursor for continuity
  dictationMode?: DictationMode;
  isStreaming?: boolean;      // true for interim results
  previousCleaned?: string;   // for incremental streaming cleanup
}

export interface DictationCleanupResult {
  cleanedText: string;
  wasAIPolished: boolean;
  mode: DictationMode;
  timedOut?: boolean;
  // Streaming-specific
  isComplete?: boolean;
  deltaFromPrevious?: string;
}

export interface StreamingCleanupCallbacks {
  onPartialResult?: (result: DictationCleanupResult) => void;
  onComplete?: (result: DictationCleanupResult) => void;
  onError?: (error: Error) => void;
}

// ─── Fine-Tuning Consent & Logging ────────────────────────────────

export function setVoiceLoggingConsent(enabled: boolean) {
  try { localStorage.setItem(LOGGING_CONSENT_KEY, JSON.stringify(enabled)); } catch {}
}

export function getVoiceLoggingConsent(): boolean {
  try {
    const raw = localStorage.getItem(LOGGING_CONSENT_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch { return false; }
}

export interface VoiceLogEntry {
  timestamp: number;
  type: "cleanup" | "edit";
  input: string;
  output: string;
  mode?: string;
  tone?: string;
  targetApp?: string;
  instruction?: string;
}

export function logVoicePair(entry: VoiceLogEntry) {
  if (!getVoiceLoggingConsent()) return;
  try {
    const raw = localStorage.getItem(LOGGING_STORE_KEY);
    const log: VoiceLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    const trimmed = log.slice(-500);
    localStorage.setItem(LOGGING_STORE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getVoiceFineTuneLog(): VoiceLogEntry[] {
  try {
    const raw = localStorage.getItem(LOGGING_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearVoiceFineTuneLog() {
  try { localStorage.removeItem(LOGGING_STORE_KEY); } catch {}
}

// ─── Custom Dictionary Store ──────────────────────────────────────

const DICT_STORAGE_KEY = "noska_custom_dictionary";

export function getCustomDictionary(): string[] {
  try {
    const raw = localStorage.getItem(DICT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addToDictionary(term: string) {
  const dict = getCustomDictionary();
  if (!dict.includes(term)) {
    dict.push(term);
    try { localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(dict)); } catch {}
  }
}

export function removeDictionaryTerm(term: string) {
  const dict = getCustomDictionary().filter(t => t !== term);
  try { localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(dict)); } catch {}
}

// ─── Target App Detection ─────────────────────────────────────────

export function detectTargetApp(element?: HTMLElement | null): TargetApp {
  if (!element) return "docs";

  const tag = element.tagName.toLowerCase();
  const className = (element.className || "").toLowerCase();
  const id = (element.id || "").toLowerCase();
  const placeholder = (element.getAttribute("placeholder") || "").toLowerCase();

  if (
    className.includes("monaco") ||
    className.includes("codemirror") ||
    className.includes("code-editor") ||
    tag === "code" ||
    element.closest("[data-mode-id]")
  ) return "code";

  if (
    className.includes("chat") ||
    className.includes("message") ||
    className.includes("slack") ||
    className.includes("discord") ||
    id.includes("chat") ||
    placeholder.includes("message") ||
    placeholder.includes("chat") ||
    element.closest("[data-chat]") ||
    element.closest(".ai-prompt") ||
    element.closest(".prompt-composer")
  ) return "chat";

  if (
    className.includes("email") ||
    className.includes("compose") ||
    className.includes("gmail") ||
    id.includes("compose") ||
    placeholder.includes("subject") ||
    placeholder.includes("compose")
  ) return "email";

  return "docs";
}

function defaultToneForApp(app: TargetApp): ToneSetting {
  switch (app) {
    case "chat": return "casual";
    case "email": return "professional";
    case "docs": return "neutral";
    case "code": return "neutral";
    case "unknown": return "neutral";
  }
}

// ─── System Prompt Builder ────────────────────────────────────────

function buildDictationSystemPrompt(
  targetApp: TargetApp,
  toneSetting: ToneSetting,
  customDictionary: string[],
  language: string,
  cursorContext?: string,
  isStreaming?: boolean,
  previousCleaned?: string,
  sourceLanguage?: string,
  targetLanguage?: string
): string {
  const dictSection = customDictionary.length > 0
    ? `\n- custom_dictionary: [${customDictionary.map(t => `"${t}"`).join(", ")}]`
    : "\n- custom_dictionary: []";

  const cursorSection = cursorContext
    ? `\n- cursor_context: "${cursorContext.slice(-120)}"`
    : "";

  const streamingSection = isStreaming
    ? `\n- streaming_mode: true (interim result, may be incomplete)`
    : "";

  const previousSection = previousCleaned
    ? `\n- previous_cleaned: "${previousCleaned.slice(-200)}"`
    : "";

  return `You are a real-time dictation cleanup engine. You receive raw, unedited speech-to-text transcription and output polished text ready to insert directly into the user's active application. You never add commentary, explanation, or anything other than the cleaned text itself.

INPUT CONTEXT (provided each call):
- target_app: "${targetApp}"
- tone_setting: "${toneSetting}"${dictSection}
- language: "${language}"${cursorSection}${streamingSection}${previousSection}
${sourceLanguage && targetLanguage ? `- translation_mode: enabled\n- source_language: "${sourceLanguage}"\n- target_language: "${targetLanguage}"\n` : ""}
WHAT TO DO:
1. Remove filler words (um, uh, like, you know) unless they're clearly meaningful to the sentence.
2. Fix self-interruptions and false starts — if the speaker restarts a sentence or corrects themselves mid-thought, output only the corrected final version.
3. Apply correct punctuation and capitalization; infer sentence boundaries from pacing cues in the transcript if provided.
4. Match the tone_setting: very_casual/casual can keep contractions, sentence fragments, casual phrasing; professional/formal should use complete sentences and no slang.
5. Adapt structure to target_app conventions:
   - Chat apps (Slack, iMessage, Discord): short lines, minimal formatting, casual by default unless tone_setting overrides
   - Email clients: proper greeting/sign-off only if the user's phrasing implies a full email; otherwise just clean the body
   - Docs/notes apps: allow paragraph structure, headers, or bullet points if the speech implies a list or outline
   - Code editors/terminal: treat as literal dictation of code/commands — do NOT rephrase, clean filler only if it's clearly narration and not code being dictated
6. Apply custom_dictionary terms exactly as spelled/cased when transcript contains a phonetic near-match.
7. Never invent facts, links, or content the user didn't say. Never summarize — output the full cleaned equivalent of what was said, not a shorter version, unless the user explicitly asked to be brief.
8. If raw_transcript is ambiguous or you're unsure of a proper noun with no dictionary match, keep the most literal phonetic-plausible interpretation rather than guessing at intent.
${sourceLanguage && targetLanguage ? `9. TRANSLATION MODE: The user is speaking in ${sourceLanguage} and wants the output in ${targetLanguage}. Translate the transcript accurately into ${targetLanguage}. Preserve the original meaning, tone, and all details. Do NOT add explanations or notes — just return the translated text.\n` : ""}${isStreaming ? `${sourceLanguage && targetLanguage ? "10" : "9"}. For streaming: return the complete cleaned text so far. Maintain consistency with previous_cleaned. Only append/modify the trailing incomplete portion.` : ""}

OUTPUT: Return only the cleaned text. No preamble, no quotes around it, no explanation of changes made.`;
}

// ─── Local Regex Cleanup (fast, no API) ───────────────────────────

function localCleanup(text: string): string {
  if (!text?.trim()) return text;
  let cleaned = text;

  // Spoken punctuation
  cleaned = cleaned
    .replace(/\b(period|full stop)\b/gi, ".")
    .replace(/\b(comma)\b/gi, ",")
    .replace(/\b(question mark)\b/gi, "?")
    .replace(/\b(exclamation mark|exclamation point)\b/gi, "!")
    .replace(/\b(new line|next line)\b/gi, "\n")
    .replace(/\b(new paragraph)\b/gi, "\n\n")
    .replace(/\b(colon)\b/gi, ":")
    .replace(/\b(semicolon)\b/gi, ";")
    .replace(/\b(open quote|start quote)\b/gi, ' "')
    .replace(/\b(close quote|end quote)\b/gi, '" ')
    .replace(/\b(dash|hyphen)\b/gi, " — ");

  // Remove fillers
  cleaned = cleaned.replace(/\b(um|uh|erm|ah|umm|uhh|hmm|you know what I mean)\b/gi, "");

  // Remove stutters
  cleaned = cleaned.replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1");

  // Fix spacing around punctuation
  cleaned = cleaned
    .replace(/\s+([.,!?:;])/g, "$1")
    .replace(/([.,!?:;])(?=[^\s\d])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Auto capitalize
  cleaned = cleaned.replace(/(^\s*|[.!?\n]\s+)([a-z])/g, (_, boundary, letter) => {
    return boundary + letter.toUpperCase();
  });

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

// ─── Streaming Cleanup State ──────────────────────────────────────

interface StreamingState {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  lastRawTranscript: string;
  lastCleanedText: string;
  isProcessing: boolean;
  abortController: AbortController | null;
  callbacks: StreamingCleanupCallbacks;
  requestConfig: Omit<DictationCleanupRequest, "rawTranscript" | "isStreaming" | "previousCleaned">;
}

const streamingStates = new Map<string, StreamingState>();

function getStreamingState(sessionId: string): StreamingState {
  let state = streamingStates.get(sessionId);
  if (!state) {
    state = {
      debounceTimer: null,
      lastRawTranscript: "",
      lastCleanedText: "",
      isProcessing: false,
      abortController: null,
      callbacks: {},
      requestConfig: {},
    };
    streamingStates.set(sessionId, state);
  }
  return state;
}

function clearStreamingState(sessionId: string) {
  const state = streamingStates.get(sessionId);
  if (state) {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (state.abortController) state.abortController.abort();
    streamingStates.delete(sessionId);
  }
}

// ─── Multilingual Detection ───────────────────────────────────────

/**
 * Detect language from text using simple heuristics.
 * For production, consider using a proper language detection library.
 */
export function detectLanguage(text: string): string {
  if (!text || text.length < 10) return "en-US";
  
  // Common language markers
  const markers: Record<string, RegExp[]> = {
    "es-ES": [/\b(el|la|los|las|un|una|y|de|en|que|es|por|para|con|no|se|lo)\b/gi],
    "fr-FR": [/\b(le|la|les|un|une|et|de|en|que|est|pour|avec|pas|se|le)\b/gi],
    "de-DE": [/\b(der|die|das|und|in|den|von|zu|das|ist|nicht|ein|eine|für)\b/gi],
    "it-IT": [/\b(il|la|i|gli|un|uno|una|e|di|in|che|è|per|con|non|si)\b/gi],
    "pt-BR": [/\b(o|a|os|as|um|uma|e|de|em|que|é|para|com|não|se)\b/gi],
    "zh-CN": [/[\u4e00-\u9fff]/],
    "ja-JP": [/[\u3040-\u309f\u30a0-\u30ff]/],
    "ko-KR": [/[\uac00-\ud7af]/],
    "ru-RU": [/\b(и|в|не|на|я|что|то|он|а|с|как|это|к|у|за)\b/gi],
    "ar-SA": [/[\u0600-\u06ff]/],
    "hi-IN": [/\b(और|है|में|की|को|का|से|यह|कि|पर|एक|ने|के)\b/gi],
  };

  const lowerText = text.toLowerCase();
  let bestMatch = "en-US";
  let bestScore = 0;

  for (const [lang, patterns] of Object.entries(markers)) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = lowerText.match(pattern);
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = lang;
    }
  }

  return bestMatch;
}

/**
 * Detect if text contains code-switching (multiple languages).
 * Returns the primary language and any detected secondary languages.
 */
export function detectCodeSwitching(text: string): { primary: string; secondary: string[] } {
  const primary = detectLanguage(text);
  const secondary: string[] = [];
  
  // Check for common borrowed words/phrases that indicate code-switching
  const commonBorrowings: Record<string, string[]> = {
    "en-US": ["gracias", "merci", "danke", "arigato", "hola", "ciao", "bonjour", "guten tag"],
    "es-ES": ["thanks", "okay", "cool", "nice", "bye", "hello"],
    "fr-FR": ["okay", "cool", "weekend", "shopping", "email", "internet"],
    "de-DE": ["okay", "cool", "meeting", "deadline", "feedback", "update"],
  };
  
  const lowerText = text.toLowerCase();
  const borrowings = commonBorrowings[primary] || [];
  
  for (const word of borrowings) {
    if (lowerText.includes(word.toLowerCase()) && !secondary.includes("en-US")) {
      secondary.push("en-US");
    }
  }

  return { primary, secondary };
}

// ─── Cursor-Aware Continuity ──────────────────────────────────────

/**
 * Extract context around cursor position for continuity-aware cleanup.
 * Returns text before cursor (for context) and text after cursor (for insertion point).
 */
export function getCursorContext(
  element: HTMLElement | null,
  maxChars: number = 200
): { before: string; after: string; position: number } {
  if (!element) return { before: "", after: "", position: 0 };

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { before: "", after: "", position: 0 };

  const range = selection.getRangeAt(0);
  const textContent = element.textContent || "";
  
  // Get position relative to element
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const before = preRange.toString().slice(-maxChars);

  const postRange = range.cloneRange();
  postRange.setStart(range.endContainer, range.endOffset);
  postRange.selectNodeContents(element);
  const after = postRange.toString().slice(0, maxChars);

  return {
    before,
    after,
    position: before.length,
  };
}

/**
 * Smart merge of incremental streaming results.
 * Combines previous cleaned text with new delta, avoiding duplication.
 */
function smartMergeCleaned(previous: string, current: string): string {
  if (!previous) return current;
  if (!current) return previous;
  
  // If current starts with previous, return current (it's the full updated text)
  if (current.startsWith(previous.trim())) return current;
  
  // Find overlap
  const prevWords = previous.trim().split(/\s+/);
  const currWords = current.trim().split(/\s+/);
  
  // Look for matching suffix/prefix
  for (let i = Math.min(prevWords.length, currWords.length); i > 2; i--) {
    const prevSuffix = prevWords.slice(-i).join(" ");
    const currPrefix = currWords.slice(0, i).join(" ");
    if (prevSuffix.toLowerCase() === currPrefix.toLowerCase()) {
      // Overlap found, merge
      return prevWords.slice(0, -i).join(" ") + " " + currWords.slice(i).join(" ");
    }
  }
  
  // No clean overlap, just append with space
  return previous.trim() + " " + current.trim();
}

// ─── AI-Powered Cleanup (with Streaming Support) ──────────────────

export async function cleanDictation(
  request: DictationCleanupRequest
): Promise<DictationCleanupResult> {
  const { rawTranscript, cursorContext } = request;

  if (!rawTranscript?.trim()) {
    return { cleanedText: "", wasAIPolished: false, mode: "realtime" };
  }

  const settings = getVoiceSettings();
  const mode = request.dictationMode || settings.dictationMode || "realtime";
  const targetApp = request.targetApp || "docs";
  const language = request.language || settings.language || "en-US";
  const customDictionary = request.customDictionary || getCustomDictionary();
  const isStreaming = request.isStreaming || false;
  const previousCleaned = request.previousCleaned || "";

  // Fast path: realtime mode uses local regex only
  if (mode === "realtime") {
    return {
      cleanedText: localCleanup(rawTranscript),
      wasAIPolished: false,
      mode: "realtime",
    };
  }

  // For very short transcripts in streaming mode, use local cleanup
  if (isStreaming && rawTranscript.length < MIN_AI_CLEANUP_LENGTH) {
    return {
      cleanedText: localCleanup(rawTranscript),
      wasAIPolished: false,
      mode: "realtime",
      isComplete: false,
    };
  }

  // Determine tone
  let toneSetting: ToneSetting = request.toneSetting || defaultToneForApp(targetApp);
  if (mode === "professional") {
    toneSetting = "professional";
  }

  // Build AI system prompt
  const systemPrompt = buildDictationSystemPrompt(
    targetApp,
    toneSetting,
    customDictionary,
    language,
    cursorContext,
    isStreaming,
    previousCleaned,
    request.sourceLanguage,
    request.targetLanguage
  );

  // Build user prompt
  let userPrompt = rawTranscript;
  if (mode === "bullet_points") {
    userPrompt = `Convert the following voice transcript into clean bullet points:\n\n${rawTranscript}`;
  }

  // Race AI cleanup against a hard timeout — never block user input
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLEANUP_TIMEOUT_MS);

  try {
    const result = await aiManager.send({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: isStreaming ? 512 : 1024,
      signal: controller.signal,
      temperature: isStreaming ? 0.1 : 0.2,
    });

    clearTimeout(timeoutId);

    // Strip any accidental wrapping quotes the LLM may add
    let cleaned = result?.trim() || "";
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
      (cleaned.startsWith("`") && cleaned.endsWith("`"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // For streaming, smart merge with previous
    let finalCleaned = cleaned;
    if (isStreaming && previousCleaned) {
      finalCleaned = smartMergeCleaned(previousCleaned, cleaned);
    }

    // Log for fine-tuning (consent-gated)
    logVoicePair({
      timestamp: Date.now(),
      type: "cleanup",
      input: rawTranscript,
      output: finalCleaned,
      mode,
      tone: toneSetting,
      targetApp,
    });

    return {
      cleanedText: finalCleaned || localCleanup(rawTranscript),
      wasAIPolished: true,
      mode,
      isComplete: !isStreaming,
      deltaFromPrevious: isStreaming ? finalCleaned.slice(previousCleaned.length) : undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    // Hard fallback: always return the raw transcript (locally cleaned) immediately
    return {
      cleanedText: localCleanup(rawTranscript),
      wasAIPolished: false,
      mode,
      timedOut: true,
    };
  }
}

/**
 * Start streaming cleanup for real-time interim results.
 * Call this repeatedly with new interim transcripts.
 * Returns a cleanup function to stop streaming.
 */
export function startStreamingCleanup(
  sessionId: string,
  initialRequest: DictationCleanupRequest,
  callbacks: StreamingCleanupCallbacks
): (finalTranscript: string) => Promise<DictationCleanupResult> {
  const state = getStreamingState(sessionId);
  state.callbacks = callbacks;
  state.requestConfig = {
    targetApp: initialRequest.targetApp,
    toneSetting: initialRequest.toneSetting,
    customDictionary: initialRequest.customDictionary,
    language: initialRequest.language,
    cursorContext: initialRequest.cursorContext,
    dictationMode: initialRequest.dictationMode,
  };

  // Initial local cleanup immediately
  const initialCleaned = localCleanup(initialRequest.rawTranscript);
  state.lastCleanedText = initialCleaned;
  state.lastRawTranscript = initialRequest.rawTranscript;
  
  callbacks.onPartialResult?.({
    cleanedText: initialCleaned,
    wasAIPolished: false,
    mode: "realtime",
    isComplete: false,
  });

  // Return function to call with updated transcripts
  return async (newTranscript: string) => {
    // Debounce AI cleanup calls
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();

    const promise = new Promise<DictationCleanupResult>((resolve, reject) => {
      state.debounceTimer = setTimeout(async () => {
        state.isProcessing = true;
        
        try {
          const result = await cleanDictation({
            ...state.requestConfig,
            rawTranscript: newTranscript,
            isStreaming: true,
            previousCleaned: state.lastCleanedText,
          });

          state.lastRawTranscript = newTranscript;
          state.lastCleanedText = result.cleanedText;
          
          callbacks.onPartialResult?.(result);
          resolve(result);
        } catch (error) {
          callbacks.onError?.(error as Error);
          reject(error);
        } finally {
          state.isProcessing = false;
        }
      }, STREAMING_DEBOUNCE_MS);
    });

    return promise;
  };
}

/**
 * Finalize streaming cleanup - called when user stops speaking.
 * Returns the final cleaned result.
 */
export async function finalizeStreamingCleanup(
  sessionId: string,
  finalTranscript: string
): Promise<DictationCleanupResult> {
  const state = streamingStates.get(sessionId);
  if (!state) {
    // No streaming state, do a regular cleanup
    return cleanDictation({ ...state?.requestConfig, rawTranscript: finalTranscript, isStreaming: false });
  }

  // Cancel any pending debounce
  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  if (state.abortController) state.abortController.abort();

  // Do final cleanup without streaming flag
  const result = await cleanDictation({
    ...state.requestConfig,
    rawTranscript: finalTranscript,
    isStreaming: false,
    previousCleaned: state.lastCleanedText,
  });

  state.callbacks.onComplete?.(result);
  clearStreamingState(sessionId);
  
  return result;
}

/**
 * Convenience: synchronous cleanup for realtime insertion (no AI, fast).
 */
export function cleanDictationSync(rawTranscript: string): string {
  return localCleanup(rawTranscript);
}