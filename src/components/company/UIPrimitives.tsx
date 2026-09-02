import React from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"

interface ProgressProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  color?: string
  showLabel?: boolean
}

export function Progress({ value, max = 100, size = "md", color, showLabel = false }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] text-[var(--muted)]">Progress</span>
          <span className="text-[9px] font-semibold text-[var(--text)]">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full ${heights[size]} rounded-full bg-[var(--surface-2)]`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`${heights[size]} rounded-full`}
          style={{ background: color || "var(--accent)" }}
        />
      </div>
    </div>
  )
}

interface StepperProps {
  steps: string[]
  current: number
  orientation?: "horizontal" | "vertical"
}

export function Stepper({ steps, current, orientation = "horizontal" }: StepperProps) {
  const isVertical = orientation === "vertical"
  return (
    <div className={`flex ${isVertical ? "flex-col" : "flex-row items-center"} gap-2`}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                done ? "bg-[var(--accent)] text-white" : active ? "bg-[var(--accent)]/20 text-[var(--accent)] border-2 border-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]"
              }`}>
                {done ? <Check size={10} /> : i + 1}
              </div>
              <span className={`text-[10px] ${active ? "font-semibold text-[var(--text)]" : done ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>{step}</span>
            </div>
            {i < steps.length - 1 && !isVertical && (
              <div className={`flex-1 h-px mx-1 ${done ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface TabsProps {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-[var(--surface-2)] rounded-xl">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
            active === tab ? "bg-[var(--surface)] text-[var(--text)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

interface AccordionItem {
  title: string
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  multiple?: boolean
}

export function Accordion({ items, multiple = false }: AccordionProps) {
  const [open, setOpen] = React.useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setOpen(prev => {
      const next = new Set(multiple ? prev : [])
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden">
          <button onClick={() => toggle(i)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition cursor-pointer">
            {item.title}
            <motion.span animate={{ rotate: open.has(i) ? 180 : 0 }} className="text-[var(--muted)]">▾</motion.span>
          </button>
          <AnimatePresenceWrapper open={open.has(i)}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 text-[11px] text-[var(--muted)]">{item.content}</div>
            </motion.div>
          </AnimatePresenceWrapper>
        </div>
      ))}
    </div>
  )
}

function AnimatePresenceWrapper({ open, children }: { open: boolean; children: React.ReactNode }) {
  const { AnimatePresence } = require("framer-motion")
  return <AnimatePresence>{open && children}</AnimatePresence>
}
