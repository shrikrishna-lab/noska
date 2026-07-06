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
  // The app also assigns the same `realtimeCollab` singleton (see
  // src/lib/realtimeCollab.ts) onto `window` somewhere in app bootstrap so
  // components deep in the tree can read presence without prop-drilling
  // it everywhere. Declared as `unknown` here (not the real
  // `RealtimeCollab` class type) since importing that class type here
  // would create a circular type dependency between this ambient
  // declaration file and the module — callers narrow it with `?.` and
  // `as` at each read site, matching how it's used today.
  realtimeCollab?: unknown;
  // Custom global prompt/confirm dialogs — assigned once in src/App.tsx's
  // bootstrap effect (backed by the app's own CustomDialog component
  // instead of the native browser prompt()/confirm(), which don't fit the
  // app's UI). Called from many still-untyped .jsx files
  // (WorkspaceViews.jsx, Sidebar.jsx, Modals.jsx) via `await
  // window.noskaPrompt(...)`/`await window.noskaConfirm(...)`.
  noskaPrompt?: (title: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  noskaConfirm?: (title: string) => Promise<boolean>;
}
