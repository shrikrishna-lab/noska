"use client";

import React, { useEffect, useState } from "react";
import { Mic, MicOff, Square, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "../../lib/utils";
import { useVoiceController, globalVoiceController } from "../../lib/voice/voice-controller";

export interface VoiceInputProps {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function VoiceInput({
  className,
  onStart,
  onStop,
  onTranscript,
  onError,
  ...props
}: React.ComponentProps<"div"> & VoiceInputProps) {
  const { isListening, time, frequencyLevels, toggle } = useVoiceController({
    onStart,
    onStop,
    onTranscript,
    onError,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const onClickHandler = () => {
    toggle();
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} {...props}>
      <motion.div
        className={cn(
          "flex p-2 border items-center justify-center rounded-full cursor-pointer select-none transition-colors shadow-sm",
          isListening
            ? "bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] shadow-[0_0_15px_rgba(var(--accent-rgb,99,102,241),0.25)]"
            : "bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text)]"
        )}
        layout
        transition={{
          layout: {
            duration: 0.3,
          },
        }}
        onClick={onClickHandler}
        role="button"
        aria-label={isListening ? "Stop voice typing" : "Start voice typing"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClickHandler();
          }
        }}
      >
        <div className="h-5 w-5 items-center justify-center flex">
          {isListening ? (
            <motion.div
              className="w-3.5 h-3.5 bg-[var(--accent)] rounded-xs"
              animate={{
                scale: [1, 0.85, 1],
                rotate: [0, 90, 180, 270, 360],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </div>

        <AnimatePresence mode="wait">
          {isListening && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{
                duration: 0.25,
              }}
              className="overflow-hidden flex gap-2.5 items-center justify-center"
            >
              <div className="flex gap-0.5 items-center justify-center h-4">
                {[...Array(12)].map((_, i) => {
                  const level = frequencyLevels[i] || 0.05;
                  const targetHeight = Math.max(2, Math.round(level * 16));
                  return (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-[var(--accent)] rounded-full"
                      initial={{ height: 2 }}
                      animate={{
                        height: isListening ? targetHeight : 2,
                      }}
                      transition={{
                        duration: 0.08,
                        ease: "easeOut",
                      }}
                    />
                  );
                })}
              </div>

              <div className="text-xs text-[var(--text-secondary)] w-10 text-center font-mono select-none font-medium">
                {formatTime(time)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/**
 * Floating Voice Typing HUD shown across the entire workspace whenever voice dictation is active.
 */
export function VoiceFloatingIndicator() {
  const { isListening, time, frequencyLevels, stop } = useVoiceController();
  const [lastTranscript, setLastTranscript] = useState<string>("");

  useEffect(() => {
    const unsub = globalVoiceController.onTranscript((text) => {
      setLastTranscript(text);
    });
    return unsub;
  }, []);

  if (!isListening) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--elevated)]/95 backdrop-blur-md border border-[var(--accent)]/40 shadow-2xl text-[var(--text)] select-none pointer-events-auto"
      >
        {/* Pulsing indicator */}
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-40 animate-ping" />
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shadow-md">
            <Mic size={15} />
          </div>
        </div>

        {/* Real-time 12-band frequency waveform */}
        <div className="flex gap-0.5 items-center justify-center h-5 px-1">
          {[...Array(12)].map((_, i) => {
            const level = frequencyLevels[i] || 0.08;
            const targetHeight = Math.max(3, Math.round(level * 20));
            return (
              <motion.div
                key={i}
                className="w-1 bg-[var(--accent)] rounded-full"
                animate={{ height: targetHeight }}
                transition={{ duration: 0.08, ease: "easeOut" }}
              />
            );
          })}
        </div>

        {/* Status text & timer */}
        <div className="flex flex-col min-w-[120px] max-w-[280px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
              <Sparkles size={11} /> Voice typing
            </span>
            <span className="text-[11px] font-mono font-semibold text-[var(--text-secondary)]">
              {formatTime(time)}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] truncate">
            {lastTranscript ? `"${lastTranscript}"` : "Listening... speak now"}
          </span>
        </div>

        {/* Shortcut hint badge */}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
          Ctrl+Shift+Space
        </kbd>

        {/* Stop button */}
        <button
          onClick={() => stop()}
          className="p-1.5 rounded-full hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition cursor-pointer"
          title="Stop voice typing"
        >
          <Square size={13} fill="currentColor" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default VoiceInput;
