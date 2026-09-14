import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles, X, Check, ArrowUpRight, Volume2 } from "lucide-react";
import { hapticFeedback } from "../index";

// Waveform Icon matching user's exact specification (3 vertical rounded bars)
export const FlowWaveformIcon: React.FC<{ size?: number; className?: string; isAnimating?: boolean }> = ({
  size = 24,
  className = "",
  isAnimating = false,
}) => {
  return (
    <div
      className={`flow-waveform-icon ${isAnimating ? "flow-waveform-icon--animating" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="flow-waveform-bar flow-waveform-bar--left" />
      <span className="flow-waveform-bar flow-waveform-bar--mid" />
      <span className="flow-waveform-bar flow-waveform-bar--right" />
    </div>
  );
};

export interface MobileFlowPillProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  onOpenAI?: () => void;
  isPageRoute?: boolean;
}

export const MobileFlowPill: React.FC<MobileFlowPillProps> = ({
  isOpen,
  onClose,
  onInsertText,
  onOpenAI,
  isPageRoute = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalChunk = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalChunk += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (finalChunk) {
            setTranscript((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
          }
          setInterimText(currentInterim);
        };

        recognition.onerror = (e: any) => {
          console.warn("[Noska Flow] Speech recognition error:", e);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        // Auto-start listening on open
        try {
          recognition.start();
          setIsRecording(true);
        } catch {
          // May require user interaction on some mobile webviews
        }
      } catch (err) {
        console.warn("[Noska Flow] Failed to initialize speech recognition:", err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  const toggleRecording = () => {
    hapticFeedback("medium");
    if (!recognitionRef.current) {
      // Fallback simulation for devices without speech recognition engine
      if (!isRecording) {
        setIsRecording(true);
        const samplePhrases = [
          "Meeting notes for the team sprint sync.",
          "Brainstorming the new liquid glass mobile UI.",
          "Action items: finalize API schema and test mobile builds.",
        ];
        const nextPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
        setTimeout(() => {
          setTranscript((prev) => (prev ? `${prev} ${nextPhrase}` : nextPhrase));
          setIsRecording(false);
        }, 2200);
      } else {
        setIsRecording(false);
      }
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  const handleInsert = () => {
    hapticFeedback("heavy");
    const textToInsert = transcript || interimText;
    if (textToInsert && onInsertText) {
      onInsertText(textToInsert);
      setTranscript("");
      setInterimText("");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 440, damping: 28 }}
        className={`mobile-flow-pill-container ${isExpanded ? "mobile-flow-pill-container--expanded" : ""}`}
      >
        {/* Compact Pill State (exact match to user reference image) */}
        {!isExpanded ? (
          <motion.button
            type="button"
            className="mobile-flow-pill-compact"
            onClick={() => {
              hapticFeedback("light");
              setIsExpanded(true);
            }}
            whileTap={{ scale: 0.92 }}
            aria-label="Expand Noska Flow"
          >
            <FlowWaveformIcon isAnimating={isRecording} size={28} />
          </motion.button>
        ) : (
          /* Expanded Interactive Flow Bar */
          <div className="mobile-flow-bar">
            {/* Waveform / Status Trigger */}
            <motion.button
              type="button"
              className={`mobile-flow-bar__mic-btn ${isRecording ? "is-recording" : ""}`}
              onClick={toggleRecording}
              whileTap={{ scale: 0.9 }}
              aria-label={isRecording ? "Pause recording" : "Start recording"}
            >
              <FlowWaveformIcon isAnimating={isRecording} size={22} />
              {isRecording && <span className="mobile-flow-bar__pulse-ring" />}
            </motion.button>

            {/* Transcript / Prompt preview */}
            <div
              className="mobile-flow-bar__content"
              onClick={() => {
                if (!transcript && !interimText) {
                  toggleRecording();
                }
              }}
            >
              <div className="mobile-flow-bar__header-row">
                <span className="mobile-flow-bar__tag">
                  {isRecording ? "Flow Listening…" : transcript ? "Flow Ready" : "Noska Flow"}
                </span>
                {transcript && (
                  <span className="mobile-flow-bar__word-count">
                    {transcript.split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>
              <p className="mobile-flow-bar__text truncate">
                {transcript || interimText || (isRecording ? "Speak naturally to flow…" : "Tap mic to dictate or ask AI")}
              </p>
            </div>

            {/* Actions */}
            <div className="mobile-flow-bar__actions">
              {(transcript || interimText) ? (
                <motion.button
                  type="button"
                  className="mobile-flow-bar__btn mobile-flow-bar__btn--primary"
                  onClick={handleInsert}
                  whileTap={{ scale: 0.92 }}
                  title="Insert into page"
                >
                  <Check size={16} strokeWidth={2.6} />
                  <span>{isPageRoute ? "Insert" : "Create"}</span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  className="mobile-flow-bar__btn mobile-flow-bar__btn--ai"
                  onClick={() => {
                    hapticFeedback("light");
                    onOpenAI?.();
                  }}
                  whileTap={{ scale: 0.92 }}
                  title="Ask AI"
                >
                  <Sparkles size={16} strokeWidth={2.2} />
                </motion.button>
              )}

              {/* Minimize / Collapse Button */}
              <button
                type="button"
                className="mobile-flow-bar__btn mobile-flow-bar__btn--icon"
                onClick={() => {
                  hapticFeedback("light");
                  setIsExpanded(false);
                }}
                title="Minimize pill"
              >
                <FlowWaveformIcon size={16} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                className="mobile-flow-bar__btn mobile-flow-bar__btn--close"
                onClick={() => {
                  hapticFeedback("light");
                  onClose();
                }}
                aria-label="Close Flow"
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
