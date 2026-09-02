import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Keyboard } from "lucide-react"

const SHORTCUTS = [
  { category: "Navigation", items: [
    { keys: ["⌘", "K"], description: "Open command palette" },
    { keys: ["⌘", "P"], description: "Quick switcher" },
    { keys: ["⌘", "N"], description: "Create new page" },
    { keys: ["⌘", "⌫"], description: "Go back" },
    { keys: ["⌘", "⇧", "P"], description: "Go to pages" },
    { keys: ["⌘", "⇧", "J"], description: "Go to projects" },
    { keys: ["⌘", "⇧", "T"], description: "Go to teams" },
    { keys: ["⌘", "⇧", "M"], description: "Go to members" },
  ]},
  { category: "Pages", items: [
    { keys: ["⌘", "⇧", "F"], description: "Toggle favorites" },
    { keys: ["⌘", "D"], description: "Duplicate page" },
    { keys: ["⌘", "⇧", "A"], description: "Archive page" },
    { keys: ["⌘", "⇧", "L"], description: "Lock/unlock page" },
    { keys: ["⌘", "⇧", "S"], description: "Share page" },
    { keys: ["⌘", "⇧", "E"], description: "Import / Export" },
    { keys: ["⌘", "⇧", "H"], description: "Version history" },
    { keys: ["⌘", "⇧", "R"], description: "Page analytics" },
  ]},
  { category: "Lists", items: [
    { keys: ["↑", "↓"], description: "Navigate items" },
    { keys: ["Enter"], description: "Open selected" },
    { keys: ["Esc"], description: "Close / Deselect" },
    { keys: ["/"], description: "Focus search" },
    { keys: ["Space"], description: "Toggle select" },
    { keys: ["⌘", "A"], description: "Select all" },
  ]},
  { category: "General", items: [
    { keys: ["⌘", "S"], description: "Save changes" },
    { keys: ["⌘", "Z"], description: "Undo" },
    { keys: ["⌘", "⇧", "Z"], description: "Redo" },
    { keys: ["?"], description: "Show shortcuts" },
  ]},
]

interface CompanyShortcutsPanelProps {
  open: boolean
  onClose: () => void
}

export function CompanyShortcutsPanel({ open, onClose }: CompanyShortcutsPanelProps) {
  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <Keyboard size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {SHORTCUTS.map(group => (
                <div key={group.category}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                    {group.category}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--surface-2)] transition"
                      >
                        <span className="text-[12px] text-[var(--text)]">{item.description}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key, j) => (
                            <React.Fragment key={j}>
                              <kbd className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-[10px] font-mono font-semibold bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--muted)]">
                                {key}
                              </kbd>
                              {j < item.keys.length - 1 && (
                                <span className="text-[9px] text-[var(--muted)]">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)]/70 text-center">
              <p className="text-[10px] text-[var(--muted)]">
                Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[9px]">?</kbd> anywhere to show shortcuts
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
