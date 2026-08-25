/**
 * Speech Recognition abstraction and adapter for continuous dictation.
 */

export interface SpeechRecognitionCallbacks {
  onTranscript: (finalText: string, interimText: string) => void;
  onError: (error: Error) => void;
  onEnd: () => void;
}

export interface SpeechRecognitionAdapter {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** Errors that will recur forever if we blindly restart — must surface and stop. */
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);
const MAX_RESTART_ATTEMPTS = 5;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createBrowserSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  lang: string = "en-US"
): SpeechRecognitionAdapter {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    throw new Error("Browser SpeechRecognition is not supported on this platform.");
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  let isExplicitStop = false;
  let fatalOccurred = false;
  let restartAttempts = 0;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRestartTimer = () => {
    if (restartTimer !== null) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  recognition.onresult = (event: any) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i];
      const text = item[0]?.transcript || "";
      if (item.isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    callbacks.onTranscript(finalTranscript, interimTranscript);
  };

  recognition.onerror = (event: any) => {
    const code = event.error || "unknown";
    if (code === "no-speech" || code === "aborted") {
      // Silence and user-initiated aborts are normal during dictation
      return;
    }
    if (FATAL_ERRORS.has(code)) {
      fatalOccurred = true;
      clearRestartTimer();
    }
    callbacks.onError(new Error(`Speech recognition error: ${code}`));
  };

  recognition.onend = () => {
    if (isExplicitStop || fatalOccurred) {
      callbacks.onEnd();
      return;
    }
    // Browser auto-stopped (silence timeout etc.) — reconnect after a short
    // delay so the engine has time to fully release before starting again.
    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      callbacks.onEnd();
      return;
    }
    restartAttempts += 1;
    clearRestartTimer();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (isExplicitStop || fatalOccurred) {
        callbacks.onEnd();
        return;
      }
      try {
        recognition.start();
      } catch {
        callbacks.onEnd();
      }
    }, 250);
  };

  return {
    start: () => {
      isExplicitStop = false;
      fatalOccurred = false;
      restartAttempts = 0;
      clearRestartTimer();
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
        recognition.stop();
      } catch {
        // Ignore if already stopped
      }
    },
    abort: () => {
      isExplicitStop = true;
      clearRestartTimer();
      try {
        recognition.abort();
      } catch {
        // Ignore if already aborted
      }
    },
  };
}
