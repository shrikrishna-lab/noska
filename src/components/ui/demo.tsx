"use client"

import * as React from "react"

import {
  AiPromptInput,
  type AiModelSelection,
  type AiPromptSendStatus,
} from "@/components/ui/ai-prompt-input"

// ONLY DEFAULT EXPORT WILL BE TREATED AS A DEMO
export default function DemoOne() {
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<AiPromptSendStatus>("idle")
  const [modelSelection, setModelSelection] = React.useState<AiModelSelection>({
    id: "opus-4.5",
    effort: "high",
    context: "200K",
    fast: true,
    thinking: false,
  })
  const timersRef = React.useRef<number[]>([])

  React.useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  const handleSubmit = () => {
    setStatus("loading")
    const successTimer = window.setTimeout(() => {
      setStatus("success")
      const idleTimer = window.setTimeout(() => {
        setStatus("idle")
        setValue("")
      }, 900)
      timersRef.current.push(idleTimer)
    }, 1400)
    timersRef.current.push(successTimer)
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center justify-center px-2 py-10">
      <AiPromptInput
        value={value}
        onChange={setValue}
        modelSelection={modelSelection}
        onModelSelectionChange={setModelSelection}
        status={status}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
