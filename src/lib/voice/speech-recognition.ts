/**
 * Speech Recognition abstraction and adapter for continuous real-time dictation.
 */

export interface SpeechRecognitionCallbacks {
  onTranscript: (finalText: string, interimText: string, fullTranscript: string) => void;
  onError: (error: Error) => void;
  onEnd: () => void;
}

export interface SpeechRecognitionAdapter {
  start: () => void | Promise<void>;
  stop: () => void | Promise<void>;
  abort: () => void | Promise<void>;
}

/** Engine-neutral contract used by the dictation controller. */
export interface SpeechEngine extends SpeechRecognitionAdapter {
  readonly id: "browser" | "tauri-whisper";
}

export type WebVoiceReadiness = {
  ready: boolean;
  code: "ready" | "secure-context" | "microphone-unavailable" | "speech-recognition-unavailable";
  message: string;
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Browser dictation needs both microphone capture and the Web Speech API.
 * Keeping this diagnosis explicit prevents the generic, misleading
 * "nothing happened" state on Safari, Firefox, HTTP deployments, and locked
 * down webviews.
 */
export function getWebVoiceReadiness(): WebVoiceReadiness {
  if (typeof window === "undefined") {
    return { ready: false, code: "speech-recognition-unavailable", message: "Voice typing is only available in a browser window." };
  }
  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return { ready: false, code: "secure-context", message: "Voice typing needs HTTPS. Open Noska over a secure connection and try again." };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ready: false, code: "microphone-unavailable", message: "This browser cannot access a microphone. Try Chrome or Edge on a secure connection." };
  }
  if (!isSpeechRecognitionSupported()) {
    return { ready: false, code: "speech-recognition-unavailable", message: "Live web dictation is supported in Chrome or Edge. Use the Noska desktop app for local Whisper." };
  }
  return { ready: true, code: "ready", message: "Ready" };
}

export function createBrowserSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  lang: string = "en-US"
): SpeechEngine {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    throw new Error("Live web dictation is supported in Chrome or Edge. Use the Noska desktop app for local Whisper.");
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  let isExplicitStop = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let restartAttempt = 0;

  const clearRestartTimer = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const scheduleRestart = () => {
    if (isExplicitStop || restartTimer) return;
    const delay = Math.min(8000, 250 * 2 ** Math.min(restartAttempt, 5));
    restartAttempt += 1;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (isExplicitStop) return;
      try {
        recognition.start();
        restartAttempt = 0;
      } catch {
        scheduleRestart();
      }
    }, delay);
  };

  recognition.onresult = (event: any) => {
    const ts = new Date().toISOString();
    let accumulatedFinal = "";
    let newlyFinal = "";
    let currentInterim = "";
    const rawParts: Array<{ text: string; isFinal: boolean }> = [];

    // Iterate through all results in the current session
    for (let i = 0; i < event.results.length; ++i) {
      const item = event.results[i];
      const text = item[0]?.transcript || "";
      rawParts.push({ text, isFinal: !!item.isFinal });
      if (item.isFinal) {
        accumulatedFinal += (accumulatedFinal ? " " : "") + text.trim();
        if (i >= (event.resultIndex ?? 0)) newlyFinal += (newlyFinal ? " " : "") + text.trim();
      } else {
        currentInterim += (currentInterim ? " " : "") + text.trim();
      }
    }

    const fullTranscript = (accumulatedFinal + (accumulatedFinal && currentInterim ? " " : "") + currentInterim).trim();

    // Diagnosis log: every onresult with timestamp and raw payload (Task 1.1)
    try {
      console.debug("[Voice][speech-recognition] onresult", {
        ts,
        resultIndex: (event as any).resultIndex,
        resultsLength: event.results.length,
        accumulatedFinal,
        currentInterim,
        fullTranscript,
        rawParts,
      });
    } catch {}

    // Guard: never swallow errors silently — wrap handler in try/catch with logging
    try {
      // `finalText` is deliberately only the new finalized span. Continuous
      // browser recognition keeps earlier finalized results in every event;
      // forwarding that cumulative value would execute an Agent command twice.
      callbacks.onTranscript(newlyFinal, currentInterim, fullTranscript);
    } catch (e) {
      console.error("[Voice][speech-recognition] onTranscript handler threw", { ts, error: (e as Error)?.message, stack: (e as Error)?.stack });
    }
  };

  recognition.onerror = (event: any) => {
    const ts = new Date().toISOString();
    const errorCode = event?.error || "unknown";
    const errorMsg = event?.message || "";
    const msg = errorMsg ? `[${errorCode}] ${errorMsg}` : `[${errorCode}]`;
    console.warn(`[Voice][speech-recognition] onerror ${msg}`, {
      ts,
      code: errorCode,
      message: errorMsg,
      eventKeys: typeof event === "object" ? Object.keys(event) : [],
    });
    if (errorCode === "no-speech") {
      return;
    }
    if (errorCode === "aborted" && isExplicitStop) {
      return;
    }
    const err: any = new Error(`Speech recognition error: ${errorCode}`);
    err.code = errorCode;
    callbacks.onError(err);
  };

  recognition.onend = () => {
    if (!isExplicitStop) {
      // Chrome ends recognition after silence/network transitions even when
      // continuous=true. Restart with bounded exponential backoff so a
      // transient disconnect does not create a tight start/error loop.
      scheduleRestart();
    }
    callbacks.onEnd();
  };

  return {
    id: "browser" as const,
    start: () => {
      isExplicitStop = false;
      clearRestartTimer();
      restartAttempt = 0;
      try {
        recognition.start();
      } catch (err: any) {
        if (err.name !== "InvalidStateError") {
          throw err;
        }
      }
    },
    stop: () => {
      isExplicitStop = true;
      clearRestartTimer();
      try {
        recognition.abort();
      } catch {
        try {
          recognition.stop();
        } catch {}
      }
    },
    abort: () => {
      isExplicitStop = true;
      clearRestartTimer();
      try {
        recognition.abort();
      } catch {}
    },
  } as SpeechEngine;
}
