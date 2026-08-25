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
    if (event.error === "no-speech") {
      // Quiet silence is normal during dictation pause
      return;
    }
    if (event.error === "aborted" && isExplicitStop) {
      return;
    }
    const err = new Error(`Speech recognition error: ${event.error || "unknown"}`);
    callbacks.onError(err);
  };

  recognition.onend = () => {
    if (!isExplicitStop) {
      // Attempt continuous reconnect if the browser auto-stopped
      try {
        recognition.start();
        return;
      } catch {
        // Fall through to end callback
      }
    }
    callbacks.onEnd();
  };

  return {
    start: () => {
      isExplicitStop = false;
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
      try {
        recognition.stop();
      } catch {
        // Ignore if already stopped
      }
    },
    abort: () => {
      isExplicitStop = true;
      try {
        recognition.abort();
      } catch {
        // Ignore if already aborted
      }
    },
  };
}
