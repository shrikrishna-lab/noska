"use client"

import React from "react"
import { createPortal } from "react-dom"
import { Mic } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "../../lib/utils"
import { useVoiceController } from "../../lib/voice/voice-controller"

export interface VoiceInputProps {
  onStart?: () => void
  onStop?: () => void
  onTranscript?: (text: string) => void
  onError?: (error: Error) => void
}

export interface VoicePillProps {
  isListening?: boolean
  time?: number
  frequencyLevels?: number[]
  onStop?: () => void
}

export function VoicePill(props?: VoicePillProps) {
  const controller = useVoiceController()

  const isListening = props?.isListening ?? controller.isListening
  const time = props?.time ?? controller.time
  const frequencyLevels = props?.frequencyLevels ?? controller.frequencyLevels
  const handleStop = props?.onStop ?? controller.stop

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const barCount = 16

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {isListening && (
        <motion.div
          key="global-voice-pill"
          initial={{ opacity: 0, y: 24, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 18, scale: 0.92, x: "-50%" }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="fixed bottom-7 left-1/2 z-[99999] pointer-events-auto"
        >
          {/* Apple Liquid Glass Capsule Container */}
          <div
            className={cn(
              "relative flex items-center gap-2.5 h-[34px] px-3 rounded-full select-none overflow-hidden",
              // Liquid glass translucent background with refraction
              "bg-white/65 dark:bg-neutral-950/70",
              "backdrop-blur-2xl backdrop-saturate-200",
              // Specular highlights & multi-layer glass borders
              "border border-white/90 dark:border-white/20",
              "shadow-[0_10px_30px_-4px_rgba(0,0,0,0.15),0_2px_8px_0_rgba(0,0,0,0.06),inset_0_1.5px_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1.5px_0_rgba(0,0,0,0.08)]",
              "dark:shadow-[0_14px_36px_-4px_rgba(0,0,0,0.65),0_2px_10px_0_rgba(0,0,0,0.4),inset_0_1.5px_1px_0_rgba(255,255,255,0.35),inset_0_-1px_1.5px_0_rgba(0,0,0,0.6)]"
            )}
          >
            {/* Glossy top specular reflection */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/80 via-white/30 to-transparent dark:from-white/30 dark:via-white/10 opacity-90"
            />

            {/* Stop squircle button */}
            <button
              type="button"
              onClick={handleStop}
              className="group relative z-10 flex items-center justify-center p-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded-sm cursor-pointer"
              aria-label="Stop recording"
              title="Stop voice input"
            >
              <div className="w-3 h-3 rounded-[3px] bg-neutral-800 dark:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] group-hover:scale-105 group-active:scale-90 transition-all" />
            </button>

            {/* Real dynamic audio waveform bars */}
            <div className="relative z-10 flex items-center gap-[2px] h-4 px-0.5">
              {Array.from({ length: barCount }).map((_, i) => {
                const rawLevel = frequencyLevels[i] || 0.05
                const barHeight = Math.max(2.5, Math.min(14, Math.round(rawLevel * 16)))

                return (
                  <motion.span
                    key={i}
                    className="w-[2px] rounded-full bg-neutral-700/85 dark:bg-neutral-200/90"
                    animate={{ height: barHeight }}
                    transition={{ duration: 0.05, ease: "linear" }}
                    style={{ minHeight: "2.5px" }}
                  />
                )
              })}
            </div>

            {/* Cyan / Sky Blue Live Time Counter */}
            <div className="relative z-10 font-mono text-[11px] font-semibold tracking-wider text-sky-600 dark:text-sky-400 select-none min-w-[34px] text-right">
              {formatTime(time)}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function VoiceInput({
  className,
  onStart,
  onStop,
  onTranscript,
  onError,
  ...props
}: React.ComponentProps<"div"> & VoiceInputProps) {
  const { isListening, toggle } = useVoiceController({
    onStart,
    onStop,
    onTranscript,
    onError,
  })

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} {...props}>
      <motion.button
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-full cursor-pointer select-none transition-all duration-200",
          isListening
            ? "bg-red-500/15 text-red-500 border border-red-500/30 shadow-sm"
            : "bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
        )}
        onClick={() => toggle()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        role="button"
        aria-label={isListening ? "Stop voice typing" : "Start voice typing"}
      >
        <Mic className={cn("size-3.5 transition-transform", isListening && "scale-110 text-red-500 animate-pulse")} />
      </motion.button>
    </div>
  )
}

export default VoiceInput
