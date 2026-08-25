"use client"

import React from "react"
import { Mic } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { useVoiceController } from "@/lib/voice/voice-controller"

export interface VoiceInputProps {
  onStart?: () => void
  onStop?: () => void
  onTranscript?: (text: string) => void
  onError?: (error: Error) => void
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
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const onClickHandler = () => {
    toggle()
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} {...props}>
      <motion.div
        className="flex p-2 border items-center justify-center rounded-full cursor-pointer select-none bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
        layout
        transition={{
          layout: {
            duration: 0.4,
          },
        }}
        onClick={onClickHandler}
        role="button"
        aria-label={isListening ? "Stop voice typing" : "Start voice typing"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClickHandler()
          }
        }}
      >
        <div className="h-6 w-6 items-center justify-center flex">
          {isListening ? (
            <motion.div
              className="w-4 h-4 bg-primary rounded-sm"
              animate={{
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ) : (
            <Mic className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </div>

        <AnimatePresence mode="wait">
          {isListening && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{
                duration: 0.4,
              }}
              className="overflow-hidden flex gap-2 items-center justify-center"
            >
              <div className="flex gap-0.5 items-center justify-center h-4">
                {[...Array(12)].map((_, i) => {
                  const level = frequencyLevels[i] || 0.05
                  const targetHeight = Math.max(2, Math.round(level * 16))
                  return (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-primary rounded-full"
                      initial={{ height: 2 }}
                      animate={{
                        height: isListening ? targetHeight : 2,
                      }}
                      transition={{
                        duration: 0.08,
                        ease: "easeOut",
                      }}
                    />
                  )
                })}
              </div>

              <div className="text-xs text-muted-foreground w-10 text-center font-mono select-none">
                {formatTime(time)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default VoiceInput
