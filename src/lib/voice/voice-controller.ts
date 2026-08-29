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
import { insertTextAtCursor, getActiveTypingElement } from "./active-input";
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
  private frequencyLevels: number[] = new Array(12).fill(0.05);

  private subscribers: Set<VoiceSubscriber> = new Set();
  private transcriptCallbacks: Set<(text: string) => void> = new Set();
  private errorCallbacks: Set<(err: Error) => void> = new Set();

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

  public async start(options?: { onTranscript?: (text: string) => void; onError?: (err: Error) => void }) {
    if (this.isListening || this.state === "starting") return;

    this.state = "starting";
    this.error = null;
    this.time = 0;
    this.notify();

    if (!isSpeechRecognitionSupported()) {
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
      // 1. Start audio context + real frequency analyser
      this.micSession = await startMicrophoneCapture();

      // 2. Initialize Speech Recognition
      this.recognitionAdapter = createBrowserSpeechRecognition({
        onTranscript: (finalText, interimText) => {
          const text = finalText || interimText;
          if (text) {
            // Insert directly at cursor in active input/editor
            insertTextAtCursor(text);

            // Call component or global subscribers
            options?.onTranscript?.(text);
            this.transcriptCallbacks.forEach((cb) => cb(text));
          }
        },
        onError: (err) => {
          console.warn("[Voice] Recognition error:", err.message);
          this.error = err;
          this.notify();
          options?.onError?.(err);
          this.errorCallbacks.forEach((cb) => cb(err));
        },
        onEnd: () => {
          if (this.isListening) {
            // Attempt auto reconnect if listening
          }
        },
      });

      this.recognitionAdapter.start();

      this.isListening = true;
      this.state = "listening";
      this.notify();

      console.log("[Voice] 🎤 Voice typing started");

      // Start elapsed timer
      this.timerId = setInterval(() => {
        this.time += 1;
        this.notify();
      }, 1000);

      // Start real-time 12-band frequency analysis loop
      const updateFrequencies = () => {
        if (!this.isListening || !this.micSession) return;
        this.frequencyLevels = this.micSession.getFrequencyBands(12);
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

  public stop() {
    if (!this.isListening && this.state !== "starting") return;
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
    this.frequencyLevels = new Array(12).fill(0.05);

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

    // Shortcut: Ctrl + Shift + Space or Cmd + Shift + Space
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        this.toggle().catch((err) => console.warn("[Voice] Shortcut toggle failed:", err));
      }
    });
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
    if (state.isListening) {
      globalVoiceController.stop();
      options?.onStop?.();
    } else {
      globalVoiceController.start({
        onTranscript: options?.onTranscript,
        onError: options?.onError,
      });
      options?.onStart?.();
    }
  };

  const start = () => {
    globalVoiceController.start({
      onTranscript: options?.onTranscript,
      onError: options?.onError,
    });
    options?.onStart?.();
  };

  const stop = () => {
    globalVoiceController.stop();
    options?.onStop?.();
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
