/**
 * Desktop-only bridge to Noska's local Whisper runtime.
 *
 * The Rust layer owns microphone capture and model execution. This adapter
 * deliberately has the same transcript contract as the browser engine, so
 * editor insertion and interim replacement stay engine-agnostic.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { SpeechEngine, SpeechRecognitionCallbacks } from "./speech-recognition";
import { isDesktop } from "../desktop/platform";

export type LocalTranscriptionErrorCode =
  | "model-missing"
  | "model-load-failed"
  | "microphone-denied"
  | "microphone-unavailable"
  | "capability-failed"
  | "runtime-failed";

export interface LocalCapability {
  available: boolean;
  realtime: boolean;
  multilingual: boolean;
  reason?: string;
  elapsedMs?: number;
}

export interface LocalModelStatus { installed: boolean; path: string; bytes?: number }

interface TranscriptPayload {
  sessionId: string;
  text: string;
  fullTranscript?: string;
  detectedLanguage?: string;
  languageStable?: boolean;
}

interface ErrorPayload {
  sessionId?: string;
  code: LocalTranscriptionErrorCode;
  message: string;
}

function toError(payload: ErrorPayload): Error {
  const error = new Error(payload.message || "Local transcription failed");
  Object.assign(error, { code: payload.code });
  return error;
}

export class TauriWhisperEngine implements SpeechEngine {
  readonly id = "tauri-whisper" as const;
  private readonly sessionId = globalThis.crypto?.randomUUID?.() ?? `voice-${Date.now()}-${Math.random()}`;
  private unlisten: UnlistenFn[] = [];
  private started = false;
  private finalText = "";

  constructor(
    private readonly callbacks: SpeechRecognitionCallbacks,
    private readonly language = "en-US",
  ) {}

  static isAvailable(): boolean {
    return isDesktop();
  }

  static async capabilityCheck(): Promise<LocalCapability> {
    if (!isDesktop()) {
      return { available: false, realtime: false, reason: "desktop-runtime-unavailable" };
    }
    return invoke<LocalCapability>("capability_check");
  }

  static async modelStatus(): Promise<LocalModelStatus | null> {
    if (!isDesktop()) return null;
    return invoke<LocalModelStatus>("local_model_status");
  }

  static async installModel(): Promise<LocalModelStatus> {
    if (!isDesktop()) throw new Error("Local models are available in Noska Desktop only.");
    return invoke<LocalModelStatus>("install_local_model");
  }

  async start(): Promise<void> {
    if (this.started) return;
    if (!isDesktop()) {
      throw toError({ code: "capability-failed", message: "Local Whisper is only available in Noska Desktop." });
    }

    this.unlisten = await Promise.all([
      listen<TranscriptPayload>("transcription-partial", ({ payload }) => {
        if (payload.sessionId !== this.sessionId) return;
        if (payload.detectedLanguage) window.dispatchEvent(new CustomEvent("noska_voice_language_detected", { detail: { language: payload.detectedLanguage, stable: payload.languageStable === true } }));
        const full = payload.fullTranscript || [this.finalText, payload.text].filter(Boolean).join(" ").trim();
        this.callbacks.onTranscript(this.finalText, payload.text, full);
      }),
      listen<TranscriptPayload>("transcription-final", ({ payload }) => {
        if (payload.sessionId !== this.sessionId) return;
        if (payload.detectedLanguage) window.dispatchEvent(new CustomEvent("noska_voice_language_detected", { detail: { language: payload.detectedLanguage, stable: payload.languageStable === true } }));
        this.finalText = payload.fullTranscript || [this.finalText, payload.text].filter(Boolean).join(" ").trim();
        this.callbacks.onTranscript(payload.text, "", this.finalText);
      }),
      listen<ErrorPayload>("transcription-error", ({ payload }) => {
        if (payload.sessionId && payload.sessionId !== this.sessionId) return;
        this.callbacks.onError(toError(payload));
      }),
    ]);

    try {
      await invoke("start_local_transcription", { sessionId: this.sessionId, language: this.language });
      this.started = true;
    } catch (error) {
      this.disposeListeners();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    try {
      await invoke("stop_local_transcription", { sessionId: this.sessionId });
    } finally {
      this.started = false;
      this.disposeListeners();
      this.callbacks.onEnd();
    }
  }

  async abort(): Promise<void> {
    await this.stop();
  }

  private disposeListeners() {
    this.unlisten.splice(0).forEach((unlisten) => unlisten());
  }
}
