/**
 * Global Voice Controller orchestrating microphone capture, speech recognition,
 * 12-frequency-band analysis, keyboard shortcuts, and cursor-targeted text insertion.
 */

import { startMicrophoneCapture, MicrophoneSession } from "./microphone";
import {
  createBrowserSpeechRecognition,
  getWebVoiceReadiness,
  isSpeechRecognitionSupported,
  SpeechEngine,
  SpeechRecognitionCallbacks,
} from "./speech-recognition";
import { TauriWhisperEngine } from "./tauri-whisper-engine";
import {
  insertTextAtCursor,
  streamTextIntoActiveInput,
  startStreamingSession,
  endStreamingSession,
  getActiveTypingElement,
  resetVoiceTracking,
} from "./active-input";
import { getVoiceSettings, cleanVoiceTranscript, playVoiceChime } from "./voice-settings";
import { applyDictionaryCorrections, loadVoiceDictionary, type VoiceDictionary } from "./dictionary";
import { AUTO_LANGUAGE, canUseEnglishOnlyLocalModel, resolveRecognitionLanguage } from "./language";
import { classifyRewindTrigger, executeRewind } from "./rewind-engine";
import { matchVoiceSnippet } from "./snippet-engine";
import { useEffect, useState } from "react";

export type VoiceState = "idle" | "starting" | "listening" | "stopping" | "error";

/**
 * Visible connection/health state — mirrors Wispr Flow's Flow Bubble:
 * listening = mic active, no issues
 * writing = transcript actively being inserted
 * reconnecting = recognized dropped connection, retrying automatically
 * needs_attention = permission revoked or persistent failure, one-click resolution
 */
export type VoiceConnectionState = "idle" | "listening" | "writing" | "reconnecting" | "needs_attention";

export type VoiceSubscriber = (state: {
  isListening: boolean;
  time: number;
  frequencyLevels: number[];
  error: Error | null;
  connectionState: VoiceConnectionState;
  interimText: string;
}) => void;

class VoiceController {
  private state: VoiceState = "idle";
  private isListening = false;
  private time = 0;
  private timerId: NodeJS.Timeout | null = null;
  private animFrameId: number | null = null;
  private error: Error | null = null;
  private connectionState: VoiceConnectionState = "idle";
  private interimText = "";
  private aiPolishTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInterimRaw = "";
  private permissionState: PermissionState | null = null;
  private agentMode = false;
  private agentCommandCallbacks: Set<(text: string) => void> = new Set();
  private voiceDictionary: VoiceDictionary = { version: 1, entries: [] };

  private micSession: MicrophoneSession | null = null;
  private recognitionAdapter: SpeechEngine | null = null;
  private frequencyLevels: number[] = new Array(12).fill(0.05);

  private subscribers: Set<VoiceSubscriber> = new Set();
  private transcriptCallbacks: Set<(text: string, correction?: string) => void> = new Set();
  private errorCallbacks: Set<(err: Error) => void> = new Set();

  private keyListenerAttached = false;

  private async startBrowserFallback(callbacks: SpeechRecognitionCallbacks, language: string) {
    const readiness = getWebVoiceReadiness();
    if (!readiness.ready || !isSpeechRecognitionSupported()) {
      throw new Error(readiness.message);
    }
    if (!this.micSession) this.micSession = await startMicrophoneCapture();
    this.recognitionAdapter = createBrowserSpeechRecognition(callbacks, language);
    await this.recognitionAdapter.start();
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.attachGlobalKeyboardShortcut();
    }
  }

  public subscribe(cb: VoiceSubscriber): () => void {
    this.subscribers.add(cb);
    cb({
      isListening: this.isListening,
      time: this.time,
      frequencyLevels: this.frequencyLevels,
      error: this.error,
      connectionState: this.connectionState,
      interimText: this.interimText,
    });
    return () => {
      this.subscribers.delete(cb);
    };
  }

  public onTranscript(cb: (text: string, correction?: string) => void): () => void {
    this.transcriptCallbacks.add(cb);
    return () => {
      this.transcriptCallbacks.delete(cb);
    };
  }

  public onError(cb: (err: Error) => void): () => void {
    this.errorCallbacks.add(cb);
    return () => {
      this.errorCallbacks.delete(cb);
    };
  }

  public setAgentMode(on: boolean) {
    this.agentMode = on;
  }

  public getAgentMode(): boolean {
    return this.agentMode;
  }

  public onAgentCommand(cb: (text: string) => void): () => void {
    this.agentCommandCallbacks.add(cb);
    return () => {
      this.agentCommandCallbacks.delete(cb);
    };
  }

  /**
   * Route a spoken command into the app-wide voice agent pipeline from any
   * surface (e.g. the VoiceCapture modal, which runs its own recognition).
   * Handlers registered via onAgentCommand execute it.
   */
  public emitAgentCommand(text: string): void {
    if (!text?.trim()) return;
    this.agentCommandCallbacks.forEach((cb) => cb(text));
  }

  private setConnectionState(next: VoiceConnectionState) {
    if (this.connectionState !== next) {
      this.connectionState = next;
      this.notify();
    }
  }

  private notify() {
    const payload = {
      isListening: this.isListening,
      time: this.time,
      frequencyLevels: [...this.frequencyLevels],
      error: this.error,
      connectionState: this.connectionState,
      interimText: this.interimText,
    };
    this.subscribers.forEach((cb) => cb(payload));
  }

  public async start(options?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) {
    if (this.isListening || this.state === "starting") return;

    this.state = "starting";
    this.error = null;
    this.time = 0;
    this.notify();

    const voiceSettings = getVoiceSettings();
    const wantsAudioLanguageDetection = voiceSettings.language === AUTO_LANGUAGE
      || (voiceSettings.languageMode === "translation" && voiceSettings.sourceLanguage === AUTO_LANGUAGE);
    let language = resolveRecognitionLanguage(voiceSettings);
    let useLocalWhisper = false;
    if (TauriWhisperEngine.isAvailable()) {
      try {
        const capability = await TauriWhisperEngine.capabilityCheck();
        useLocalWhisper = capability.available && capability.realtime
          && (capability.multilingual || canUseEnglishOnlyLocalModel(language));
        if (useLocalWhisper && wantsAudioLanguageDetection && capability.multilingual) language = AUTO_LANGUAGE;
        if (!useLocalWhisper) {
          console.info("[Voice] Local Whisper unavailable for this language; using Browser Speech fallback.", capability.reason);
        }
      } catch (error) {
        console.warn("[Voice] Local Whisper capability check failed; using Browser Speech fallback.", error);
      }
    }

    if (!useLocalWhisper && !isSpeechRecognitionSupported()) {
      const err = new Error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Arc.");
      console.warn("[Voice] " + err.message);
      this.error = err;
      this.state = "error";
      this.notify();
      options?.onError?.(err);
      this.errorCallbacks.forEach((cb) => cb(err));
      return;
    }

    try {
      // Runtime permission re-check (OS can silently revoke)
      try {
        if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
          const perm = await (navigator as any).permissions.query({ name: "microphone" as any });
          this.permissionState = perm.state;
          if (perm.state === "denied") {
            const err = new Error("Microphone permission denied — please re-enable in browser/OS settings.");
            this.error = err;
            this.state = "error";
            this.setConnectionState("needs_attention");
            this.notify();
            options?.onError?.(err);
            this.errorCallbacks.forEach((cb) => cb(err));
            return;
          }
          // Listen for runtime revocation while listening
          perm.onchange = () => {
            if (perm.state === "denied" && this.isListening) {
              this.setConnectionState("needs_attention");
              this.error = new Error("Microphone permission revoked — click to re-enable.");
              this.notify();
            }
          };
        }
      } catch {}

      // Refresh the plain-file dictionary once per recording session. Corrections
      // are deterministic post-processing; engine bias remains optional.
      this.voiceDictionary = await loadVoiceDictionary();

      // Pre-resolve typing target BEFORE mic capture steals focus
      startStreamingSession();

      // Browser Speech uses Web Audio for its waveform. Native Whisper owns
      // capture in Rust so it does not contend for the microphone here.
      if (!useLocalWhisper) this.micSession = await startMicrophoneCapture();

      // 2. Initialize Speech Recognition
      this.setConnectionState("listening");
      const recognitionCallbacks: SpeechRecognitionCallbacks = {
        onTranscript: (finalText, interimText, fullTranscript) => {
          const ts = new Date().toISOString();
          // Structured logging for diagnosis (Task 1.1)
          console.debug(`[Voice][onresult] ${ts} final=${JSON.stringify(finalText)} interim=${JSON.stringify(interimText)} full=${JSON.stringify(fullTranscript)}`);
          const raw = fullTranscript || finalText || interimText;
          if (!raw?.trim()) return;
          const settings = getVoiceSettings();
          let text = cleanVoiceTranscript(raw, settings.smartClean);
          this.lastInterimRaw = raw;
          this.interimText = interimText || "";
          // ── Wispr fix: stream interim immediately (never wait for AI) ──
          // Show raw/local-cleaned text live so user gets instant visual confirmation.
          // AI polish runs debounced/ on final and replaces in-place.
          const isFinal = !!finalText;
          const isInterimOnly = !finalText && !!interimText;
          let correctionSummary: string | undefined;
          if (isFinal) {
            const corrected = applyDictionaryCorrections(text, this.voiceDictionary);
            text = corrected.text;
            if (corrected.corrections.length) {
              correctionSummary = corrected.corrections.map((item) => `${item.heard} → ${item.write}`).join("; ");
            }
          }

          // ── Agent mode: route all spoken audio (interim & final) to AI Agent ONLY ──
          // NEVER type or stream into active inputs/editor when in Agent mode!
          if (this.agentMode) {
            if (isInterimOnly) {
              const liveAgentPreview = `🤖 ${text}`;
              this.transcriptCallbacks.forEach((cb) => cb(liveAgentPreview));
              if (options?.onTranscript) {
                options.onTranscript(liveAgentPreview);
              }
              this.notify();
              return;
            }

            if (isFinal) {
              const command = applyDictionaryCorrections(cleanVoiceTranscript(finalText, settings.smartClean), this.voiceDictionary);
              const commandText = command.text;
              const commandCorrection = command.corrections.length
                ? command.corrections.map((item) => `${item.heard} → ${item.write}`).join("; ")
                : undefined;
              
              // Broadcast to any registered agent command callbacks
              this.agentCommandCallbacks.forEach((cb) => cb(commandText));
              const finalAgentPreview = `🤖 AI Agent: ${commandText}`;
              this.transcriptCallbacks.forEach((cb) => cb(finalAgentPreview, commandCorrection));
              if (options?.onTranscript) {
                options.onTranscript(finalAgentPreview);
              }
              this.notify();
              return;
            }
          }

          // Update health: we are actively writing if text insertion will happen
          if (raw) this.setConnectionState("writing");

          // Rewind / voice-edit / snippets only on finalized utterances to avoid
          // stealing interim streaming.
          if (isFinal) {
            const activeEl = getActiveTypingElement();
            const selection = window.getSelection();
            const selectedText = selection?.toString()?.trim();

            // 1. Signature Feature: Rewind Hands-Free Self-Correction
            if (settings.rewindEnabled !== false) {
              try {
                const rewindResult = classifyRewindTrigger(raw);
                if (rewindResult.isRewind) {
                  const rewound = executeRewind(rewindResult, activeEl);
                  if (rewound) {
                    const msg = rewindResult.isDelete ? "↺ Erased previous utterance" : `↺ Rewound: ${rewindResult.correctionText}`;
                    this.transcriptCallbacks.forEach((cb) => cb(msg));
                    return; // Successfully self-corrected in-place!
                  }
                }
              } catch {
                // If module import fails, continue smoothly
              }
            }

            // 2. Voice Edit Mode (Selection + Spoken Edit Command)
            if (selectedText && selectedText.length > 0) {
              import("./voice-edit").then(({ voiceEdit, looksLikeEditInstruction }) => {
                if (looksLikeEditInstruction(raw)) {
                  voiceEdit({
                    selectedText,
                    instruction: raw,
                    targetApp: "docs",
                  }).then((result) => {
                    if (result.wasAIEdited && result.editedText) {
                      if (activeEl && (activeEl as HTMLInputElement).setRangeText) {
                        const input = activeEl as HTMLInputElement;
                        const start = input.selectionStart || 0;
                        const end = input.selectionEnd || 0;
                        input.setRangeText(result.editedText, start, end, "end");
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                      } else if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode(result.editedText));
                        selection.collapseToEnd();
                      }
                      this.transcriptCallbacks.forEach((cb) => cb(result.editedText));
                    }
                  }).catch(() => {
                    let ok = streamTextIntoActiveInput(text);
                    if (!ok) ok = insertTextAtCursor(text);
                    this.transcriptCallbacks.forEach((cb) => cb(text));
                  });
                  return;
                }
                this._handleDictation(finalText, text, settings, options, true);
              }).catch(() => {
                this._handleDictation(finalText, text, settings, options, true);
              });
              return;
            }

            // 3. Fuzzy / Semantic Voice Snippets
            if (settings.fuzzySnippetsEnabled !== false) {
              try {
                const snippetResult = matchVoiceSnippet(raw, "docs");
                if (snippetResult.matched && snippetResult.expandedText) {
                  if (options?.onTranscript) {
                    options.onTranscript(snippetResult.expandedText);
                  } else {
                    let ok = streamTextIntoActiveInput(snippetResult.expandedText);
                    if (!ok) ok = insertTextAtCursor(snippetResult.expandedText);
                  }
                  this.transcriptCallbacks.forEach((cb) => cb(snippetResult.expandedText));
                  return;
                }
              } catch {}
            }
          }

          // 4. Standard dictation path — stream immediately; debounce AI polish.
          // For realtime mode we just stream directly. For ai_polished we stream
          // local-cleaned instantly and schedule AI polish to replace in place.
          if (isInterimOnly) {
            // Live interim: synchronous local cleanup → streaming write
            if (options?.onTranscript) {
              options.onTranscript(text);
            } else {
              let ok = streamTextIntoActiveInput(text);
              if (!ok) ok = insertTextAtCursor(text);
              if (!ok) {
                console.warn("[Voice] interim streamTextIntoActiveInput failed — retrying", { text: text.slice(0,120) });
                this.setConnectionState("reconnecting");
                setTimeout(() => {
                  let retry = streamTextIntoActiveInput(text);
                  if (!retry) retry = insertTextAtCursor(text);
                  this.setConnectionState(retry ? "writing" : "needs_attention");
                }, 80);
              }
            }
            this.transcriptCallbacks.forEach((cb) => cb(text));
            this.notify();
            // Debounce AI polish on interim (Task 2.2)
            this._scheduleAIPolish(raw, settings, options);
          } else {
            // Final chunk: stream final immediately, then polish
            this._handleDictation(raw, text, settings, options, isFinal, correctionSummary);
          }
        },
        onError: (err) => {
          const msg = (err.message || "").toLowerCase();
          if (msg.includes("aborted") || msg.includes("no-speech")) {
            return;
          }
          console.warn("[Voice] Recognition error:", err.message, { ts: new Date().toISOString() });
          // Detect permission-related errors as needs_attention
          if (msg.includes("not-allowed") || msg.includes("permission") || msg.includes("denied")) {
            this.setConnectionState("needs_attention");
            this.error = err;
          } else if (msg.includes("network")) {
            this.setConnectionState("reconnecting");
            this.error = err;
            // Will auto-retry via speech-recognition adapter; show reconnecting briefly
            setTimeout(() => { if (this.isListening) this.setConnectionState("listening"); }, 1200);
          } else {
            this.setConnectionState("reconnecting");
            this.error = err;
          }
          this.notify();
          if (this.recognitionAdapter?.id === "tauri-whisper" && this.isListening) {
            void this.startBrowserFallback(recognitionCallbacks, language)
              .then(() => this.setConnectionState("listening"))
              .catch((fallbackError) => {
                this.error = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
                this.setConnectionState("needs_attention");
                this.notify();
              });
          }
          options?.onError?.(err);
          this.errorCallbacks.forEach((cb) => cb(err));
        },
        onEnd: () => {
          if (this.isListening) {
            this.setConnectionState("reconnecting");
            console.debug("[Voice] onend while listening — will auto-reconnect", { ts: new Date().toISOString() });
            setTimeout(() => { if (this.isListening) this.setConnectionState("listening"); }, 800);
          }
        },
      };

      if (useLocalWhisper) {
        this.recognitionAdapter = new TauriWhisperEngine(recognitionCallbacks, language);
        try {
          await this.recognitionAdapter.start();
        } catch (localError) {
          console.warn("[Voice] Local Whisper failed to start; switching to Browser Speech.", localError);
          await this.startBrowserFallback(recognitionCallbacks, language);
        }
      } else {
        await this.startBrowserFallback(recognitionCallbacks, language);
      }

      this.isListening = true;
      this.state = "listening";
      this.setConnectionState("listening");
      this.notify();
      playVoiceChime("start");

      console.log("[Voice] 🎤 Voice typing started");

      // Start elapsed timer
      this.timerId = setInterval(() => {
        this.time += 1;
        this.notify();
      }, 1000);

      // Start real-time frequency analysis loop
      const updateFrequencies = () => {
        if (!this.isListening || !this.micSession) return;
        this.frequencyLevels = this.micSession.getFrequencyBands(13);
        this.notify();
        this.animFrameId = requestAnimationFrame(updateFrequencies);
      };
      this.animFrameId = requestAnimationFrame(updateFrequencies);
    } catch (err: any) {
      this.cleanup();
      this.error = err instanceof Error ? err : new Error(String(err));
      console.warn("[Voice] Failed to start:", this.error.message);
      this.state = "error";
      this.notify();
      options?.onError?.(this.error);
      this.errorCallbacks.forEach((cb) => cb(this.error!));
    }
  }

  /**
   * Internal: route transcript through dictation cleanup (AI-polished or local).
   * Task 2 fix: ALWAYS stream raw/local-cleaned text immediately so user sees
   * instant feedback. AI polish is debounced and replaces in-place; failures
   * never block the already-visible raw text (graceful fallback).
   */
  private _handleDictation(
    raw: string,
    localCleanedText: string,
    settings: ReturnType<typeof getVoiceSettings>,
    options?: { onTranscript?: (text: string) => void },
    isFinal: boolean = false,
    correctionSummary?: string
  ) {
    // Always stream local-cleaned text immediately (Wispr: raw appears live)
    if (options?.onTranscript) {
      options.onTranscript(localCleanedText);
    } else {
      let ok = streamTextIntoActiveInput(localCleanedText);
      if (!ok) {
        // Fallback: try insertTextAtCursor which resolves target independently
        ok = insertTextAtCursor(localCleanedText);
      }
      if (!ok) {
        // Retry once quietly; if no input field is focused (e.g. testing in settings), don't show an intrusive alert
        setTimeout(() => {
          let retry = streamTextIntoActiveInput(localCleanedText);
          if (!retry) retry = insertTextAtCursor(localCleanedText);
          if (retry) {
            this.setConnectionState("writing");
          }
        }, 80);
      } else {
        this.setConnectionState("writing");
      }
    }
    this.transcriptCallbacks.forEach((cb) => cb(localCleanedText, correctionSummary));
    this.notify();

    // For realtime mode we are done — no AI polish.
    if (settings.dictationMode === "realtime") return;

    // For AI modes: debounced polish that replaces streamed text in-place.
    // On final utterance, polish immediately (still non-blocking).
    if (isFinal) {
      this._runAIPolish(raw, localCleanedText, settings, options);
    } else {
      this._scheduleAIPolish(raw, settings, options);
    }
  }

  private _scheduleAIPolish(
    raw: string,
    settings: ReturnType<typeof getVoiceSettings>,
    options?: { onTranscript?: (text: string) => void }
  ) {
    if (settings.dictationMode === "realtime") return;
    if (this.aiPolishTimer) clearTimeout(this.aiPolishTimer);
    this.aiPolishTimer = setTimeout(() => {
      this._runAIPolish(raw, cleanVoiceTranscript(raw, settings.smartClean), settings, options);
    }, 800);
  }

  private _runAIPolish(
    raw: string,
    fallbackText: string,
    settings: ReturnType<typeof getVoiceSettings>,
    options?: { onTranscript?: (text: string) => void }
  ) {
    import("./dictation-cleanup").then(({ cleanDictation }) => {
      cleanDictation({
        rawTranscript: raw,
        targetApp: "docs",
        dictationMode: settings.dictationMode,
        sourceLanguage: settings.languageMode === "translation" ? settings.sourceLanguage : undefined,
        targetLanguage: settings.languageMode === "translation" ? settings.targetLanguage : undefined,
      }).then((result) => {
        const corrected = applyDictionaryCorrections(result.cleanedText || "", this.voiceDictionary);
        const polishedText = corrected.text;
        const correctionSummary = corrected.corrections.length
          ? corrected.corrections.map((item) => `${item.heard} → ${item.write}`).join("; ")
          : undefined;
        if (polishedText && polishedText !== fallbackText) {
          // Replace already-visible raw text in-place via streaming session
          if (options?.onTranscript) {
            options.onTranscript(polishedText);
          } else {
            // Re-stream replaces prefix→suffix window; user sees polish in place
            let ok = streamTextIntoActiveInput(polishedText);
            if (!ok) ok = insertTextAtCursor(polishedText);
          }
          this.transcriptCallbacks.forEach((cb) => cb(polishedText, correctionSummary));
          this.setConnectionState("writing");
        }
      }).catch((e) => {
        // Graceful fallback: keep raw that is already visible; never blank the field
        console.debug("[Voice] AI polish failed, keeping raw:", (e as Error)?.message);
      });
    }).catch(() => {
      // Module load failed — raw already visible, nothing to do
    });
  }

  public stop() {
    if (this.isListening) {
      playVoiceChime("stop");
    }
    this.cleanup();
    this.notify();
  }

  public async toggle(options?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) {
    if (this.isListening) {
      this.stop();
    } else {
      await this.start(options);
    }
  }

  private cleanup() {
    this.state = "idle";
    this.isListening = false;
    this.time = 0;
    this.frequencyLevels = new Array(13).fill(0.05);
    this.interimText = "";
    this.lastInterimRaw = "";
    this.connectionState = "idle";
    this.error = null;
    if (this.aiPolishTimer) {
      clearTimeout(this.aiPolishTimer);
      this.aiPolishTimer = null;
    }

    endStreamingSession();

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micSession) {
      this.micSession.stop();
      this.micSession = null;
    }
    if (this.recognitionAdapter) {
      this.recognitionAdapter.stop();
      this.recognitionAdapter = null;
    }
  }

  private attachGlobalKeyboardShortcut() {
    if (this.keyListenerAttached) return;
    this.keyListenerAttached = true;

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const settings = getVoiceSettings();
      const shortcut = settings.shortcut || "Ctrl+Shift+Space";

      // Parse user configured shortcut
      const parts = shortcut.toLowerCase().split("+");
      const needsCtrl = parts.includes("ctrl") || parts.includes("control");
      const needsMeta = parts.includes("cmd") || parts.includes("meta");
      const needsAlt = parts.includes("alt") || parts.includes("option");
      const needsShift = parts.includes("shift");
      const keyName = parts[parts.length - 1];

      const modMatch = (needsCtrl && e.ctrlKey) || (needsMeta && e.metaKey) || ((needsCtrl || needsMeta) && (isMac ? e.metaKey : e.ctrlKey)) || (!needsCtrl && !needsMeta);
      const altMatch = needsAlt ? e.altKey : !e.altKey || needsAlt;
      const shiftMatch = needsShift ? e.shiftKey : !e.shiftKey || needsShift;

      let keyMatch = false;
      if (keyName === "space" && e.code === "Space") keyMatch = true;
      else if (keyName === "v" && e.code === "KeyV") keyMatch = true;
      else if (keyName === "d" && e.code === "KeyD") keyMatch = true;
      else if (e.key.toLowerCase() === keyName) keyMatch = true;

      if (modMatch && altMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle().catch((err) => console.warn("[Voice] Shortcut toggle failed:", err));
      }
    });
  }

  public getMicSession(): MicrophoneSession | null {
    return this.micSession;
  }

  public getLiveFrequencyBands(count: number = 13): number[] {
    if (this.micSession && this.isListening) {
      return this.micSession.getFrequencyBands(count);
    }
    return this.frequencyLevels;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getTime(): number {
    return this.time;
  }

  public getFrequencyLevels(): number[] {
    return this.frequencyLevels;
  }

  public getError(): Error | null {
    return this.error;
  }

  public getConnectionState(): VoiceConnectionState {
    return this.connectionState;
  }

  public getInterimText(): string {
    return this.interimText;
  }

  public clearError() {
    this.error = null;
    if (!this.isListening) this.setConnectionState("idle");
    this.notify();
  }

  /** One-click recovery for needs_attention (e.g. permission denied) */
  public async requestMicPermissionAgain(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      this.error = null;
      this.setConnectionState("idle");
      this.notify();
      return true;
    } catch (e: any) {
      this.error = e instanceof Error ? e : new Error(String(e));
      this.setConnectionState("needs_attention");
      this.notify();
      return false;
    }
  }
}

export const globalVoiceController = new VoiceController();

export function useVoiceController(options?: {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (text: string) => void;
  onError?: (err: Error) => void;
}) {
  const [state, setState] = useState({
    isListening: globalVoiceController.getIsListening(),
    time: globalVoiceController.getTime(),
    frequencyLevels: globalVoiceController.getFrequencyLevels(),
    error: null as Error | null,
    connectionState: globalVoiceController.getConnectionState() as VoiceConnectionState,
    interimText: globalVoiceController.getInterimText(),
  });

  useEffect(() => {
    const unsub = globalVoiceController.subscribe((updated) => {
      setState(updated);
    });
    return unsub;
  }, []);

  const toggle = (opts?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) => {
    if (state.isListening) {
      globalVoiceController.stop();
      options?.onStop?.();
    } else {
      globalVoiceController.start({
        onTranscript: opts?.onTranscript || options?.onTranscript,
        onError: opts?.onError || options?.onError,
      });
      options?.onStart?.();
    }
  };

  const start = (opts?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) => {
    globalVoiceController.start({
      onTranscript: opts?.onTranscript || options?.onTranscript,
      onError: opts?.onError || options?.onError,
    });
    options?.onStart?.();
  };

  const stop = () => {
    globalVoiceController.stop();
    options?.onStop?.();
  };

  const setAgentMode = (on: boolean) => {
    globalVoiceController.setAgentMode(on);
  };

  const getAgentMode = () => globalVoiceController.getAgentMode();

  const requestMicPermissionAgain = () => globalVoiceController.requestMicPermissionAgain();

  const clearError = () => globalVoiceController.clearError();

  const onAgentCommand = (cb: (text: string) => void) => {
    return globalVoiceController.onAgentCommand(cb);
  };

  return {
    isListening: state.isListening,
    time: state.time,
    frequencyLevels: state.frequencyLevels,
    error: state.error,
    connectionState: state.connectionState,
    interimText: state.interimText,
    toggle,
    start,
    stop,
    setAgentMode,
    getAgentMode,
    requestMicPermissionAgain,
    clearError,
    onAgentCommand,
  };
}
