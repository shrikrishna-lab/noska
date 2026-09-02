import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Info, AlertTriangle, CheckCircle, X, HelpCircle, AlertCircle } from "lucide-react"

interface PopoverProps {
  content: React.ReactNode
  children: React.ReactNode
  title?: string
  type?: "default" | "info" | "warning" | "success" | "error" | "help"
  side?: "top" | "bottom" | "left" | "right"
  width?: number
}

export function Popover({ content, children, title, type = "default", side = "bottom", width = 280 }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const iconMap = {
    default: null,
    info: <Info size={13} className="text-blue-500" />,
    warning: <AlertTriangle size={13} className="text-amber-500" />,
    success: <CheckCircle size={13} className="text-green-500" />,
    error: <AlertCircle size={13} className="text-red-500" />,
    help: <HelpCircle size={13} className="text-purple-500" />,
  }

  const sideStyles = {
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen(!open)}>{children}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-[200] ${sideStyles[side]} bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl p-3`}
            style={{ width }}
          >
            {(title || iconMap[type]) && (
              <div className="flex items-center gap-2 mb-2">
                {iconMap[type]}
                {title && <span className="text-[12px] font-bold text-[var(--text)]">{title}</span>}
              </div>
            )}
            <div className="text-[11px] text-[var(--muted)] leading-relaxed">{content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
