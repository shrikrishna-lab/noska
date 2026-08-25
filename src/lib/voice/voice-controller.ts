/**
 * Global Voice Controller orchestrating microphone capture, speech recognition,
 * 12-frequency-band analysis, keyboard shortcuts, and cursor-targeted text insertion.
 */

import { startMicrophoneCapture, MicrophoneSession } from "./microphone";
import {
  createBrowserSpeechRecognition,
  isSpeechRecognitionSupported,
  SpeechRecognitionAdapter,
} from "./speech-recognition";
import { insertTextSmoothly, flushSmoothTyping, getActiveTypingElement } from "./active-input";
import { useEffect, useState } from "react";

export type VoiceState = "idle" | "starting" | "listening" | "stopping" | "error";

export type VoiceSubscriber = (state: {
  isListening: boolean;
  time: number;
  frequencyLevels: number[];
  error: Error | null;
}) => void;

class VoiceController {
  private state: VoiceState = "idle";
  private isListening = false;
  private time = 0;
  private timerId: NodeJS.Timeout | null = null;
  private animFrameId: number | null = null;
  private error: Error | null = null;

  private micSession: MicrophoneSession | null = null;
  private recognitionAdapter: SpeechRecognitionAdapter | null = null;
  private frequencyLevels: number[] = new Array(16).fill(0.05);

  private subscribers: Set<VoiceSubscriber> = new Set();
  private transcriptCallbacks: Set<(text: string) => void> = new Set();
  private errorCallbacks: Set<(err: Error) => void> = new Set();
  private activeOptions: {
    onStop?: () => void;
  } | null = null;
  private startGeneration = 0;

  private keyListenerAttached = false;

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
    });
    return () => {
      this.subscribers.delete(cb);
    };
  }

  public onTranscript(cb: (text: string) => void): () => void {
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

  private notify() {
    const payload = {
      isListening: this.isListening,
      time: this.time,
      frequencyLevels: [...this.frequencyLevels],
      error: this.error,
    };
    this.subscribers.forEach((cb) => cb(payload));
  }

  public async start(options?: {
    onTranscript?: (text: string) => void;
    onError?: (err: Error) => void;
    onStart?: () => void;
    onStop?: () => void;
  }): Promise<boolean> {
    if (this.isListening || this.state === "starting") return false;

    this.state = "starting";
    this.error = null;
    this.time = 0;

    if (!isSpeechRecognitionSupported()) {
      const err = new Error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Arc.");
      this.error = err;
      this.state = "error";
      this.notify();
      options?.onError?.(err);
      this.errorCallbacks.forEach((cb) => cb(err));
      return false;
    }

    try {
      // 1. Start audio context + real frequency analyser (non-blocking fallback)
      try {
        const myGeneration = ++this.startGeneration;
        this.micSession = await startMicrophoneCapture();
        if (myGeneration !== this.startGeneration && this.micSession) {
          this.micSession.stop();
          this.micSession = null;
          return false;
        }
      } catch (micErr) {
        console.warn("[Voice] Microphone analyser fallback active:", micErr);
        this.micSession = null;
      }

      // 2. Initialize Speech Recognition
      this.recognitionAdapter = createBrowserSpeechRecognition({
        onTranscript: (finalText) => {
          const text = finalText.trim();
          if (!text) return;
          insertTextSmoothly(text, null, () => {
            options?.onTranscript?.(text);
            this.transcriptCallbacks.forEach((cb) => cb(text));
          });
        },
        onError: (err) => {
          this.error = err;
          this.notify();
          options?.onError?.(err);
          this.errorCallbacks.forEach((cb) => cb(err));
        },
        onEnd: () => {
          if (this.isListening) {
            // Recognition ended unexpectedly (fatal error or restart budget
            // exhausted) — tear down so the UI doesn't stay stuck "listening".
            const opts = this.activeOptions;
            this.cleanup();
            opts?.onStop?.();
            this.notify();
          }
        },
      });

      this.activeOptions = { onStop: options?.onStop };
      this.recognitionAdapter.start();

      this.isListening = true;
      this.state = "listening";
      this.notify();
      options?.onStart?.();

      // Start elapsed timer
      this.timerId = setInterval(() => {
        this.time += 1;
        this.notify();
      }, 1000);

      // Start real-time 16-band frequency analysis loop with smooth animated fallback
      let tick = 0;
      const updateFrequencies = () => {
        if (!this.isListening) return;

        if (this.micSession) {
          this.frequencyLevels = this.micSession.getFrequencyBands(16);
        } else {
          tick += 0.25;
          this.frequencyLevels = Array.from({ length: 16 }, (_, i) =>
            Math.max(0.08, Math.min(0.9, 0.2 + 0.35 * Math.abs(Math.sin(tick + i * 0.45))))
          );
        }
        this.notify();
        this.animFrameId = requestAnimationFrame(updateFrequencies);
      };
      this.animFrameId = requestAnimationFrame(updateFrequencies);

      return true;
    } catch (err: any) {
      this.cleanup();
      this.error = err instanceof Error ? err : new Error(String(err));
      this.state = "error";
      this.notify();
      options?.onError?.(this.error);
      this.errorCallbacks.forEach((cb) => cb(this.error!));
      return false;
    }
  }

  public stop() {
    if (!this.isListening && this.state !== "starting") return;
    // Invalidate any in-flight start() awaiting the mic prompt
    this.startGeneration += 1;
    const opts = this.activeOptions;
    this.cleanup();
    opts?.onStop?.();
    this.notify();
  }

  public toggle(options?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) {
    if (this.isListening) {
      this.stop();
    } else {
      this.start(options);
    }
  }

  private cleanup() {
    this.state = "idle";
    this.isListening = false;
    this.time = 0;
    this.frequencyLevels = new Array(16).fill(0.05);

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
    flushSmoothTyping();
    this.activeOptions = null;
  }

  private attachGlobalKeyboardShortcut() {
    if (this.keyListenerAttached) return;
    this.keyListenerAttached = true;

    // Shortcut: Ctrl + Shift + Space or Cmd + Shift + Space
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.shiftKey && (e.code === "Space" || e.key === " " || e.key === "Space")) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public isBusy(): boolean {
    return this.isListening || this.state === "starting";
  }

  public getTime(): number {
    return this.time;
  }

  public getFrequencyLevels(): number[] {
    return this.frequencyLevels;
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
  });

  useEffect(() => {
    const unsub = globalVoiceController.subscribe((updated) => {
      setState(updated);
    });
    return unsub;
  }, []);

  const toggle = () => {
    // Read live controller state — the hook's snapshot goes stale on rapid clicks
    if (globalVoiceController.isBusy()) {
      globalVoiceController.stop();
    } else {
      globalVoiceController.start({
        onTranscript: options?.onTranscript,
        onError: options?.onError,
        onStart: options?.onStart,
        onStop: options?.onStop,
      });
    }
  };

  const start = () => {
    globalVoiceController.start({
      onTranscript: options?.onTranscript,
      onError: options?.onError,
      onStart: options?.onStart,
      onStop: options?.onStop,
    });
  };

  const stop = () => {
    globalVoiceController.stop();
  };

  return {
    isListening: state.isListening,
    time: state.time,
    frequencyLevels: state.frequencyLevels,
    error: state.error,
    toggle,
    start,
    stop,
  };
}
