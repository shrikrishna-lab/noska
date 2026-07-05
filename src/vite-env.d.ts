/// <reference types="vite/client" />

// Web Speech API — not in lib.dom.d.ts (still non-standard/vendor-prefixed
// in most browsers). Declared minimally here since it's used identically
// in src/features/meeting/MeetingWorkspace.tsx and
// src/features/voice/VoiceCapture.tsx as a global constructor lookup
// (window.SpeechRecognition || window.webkitSpeechRecognition).
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface Window {
  SpeechRecognition?: { new (): SpeechRecognitionLike };
  webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
}
