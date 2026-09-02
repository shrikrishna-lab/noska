import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactNode
  align?: "left" | "right"
}

export function ContextMenu({ items, children, align = "right" }: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      x: align === "right" ? e.clientX : e.clientX,
      y: e.clientY,
    })
    setOpen(true)
  }

  useEffect(() => {
    const close = () => setOpen(false)
    if (open) {
      document.addEventListener("click", close)
      document.addEventListener("contextmenu", close)
    }
    return () => {
      document.removeEventListener("click", close)
      document.removeEventListener("contextmenu", close)
    }
  }, [open])

  return (
    <div ref={ref} onContextMenu={handleContext}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[250] min-w-[160px] bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl py-1"
            style={{ left: pos.x, top: pos.y }}
          >
            {items.map((item, i) => {
              if (item.separator) return <div key={i} className="h-px bg-[var(--border)] my-1" />
              return (
                <button
                  key={i}
                  onClick={() => { item.onClick(); setOpen(false) }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition cursor-pointer ${
                    item.danger
                      ? "text-red-500 hover:bg-red-500/10"
                      : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                  } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {item.icon && <span className="w-4 shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
