import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Lock, Users, Building2, Globe } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  VISIBILITY_OPTIONS,
  type PageVisibility,
} from "../../lib/companyAuth"

interface PageVisibilitySelectorProps {
  value: PageVisibility
  onChange: (visibility: PageVisibility) => void
  companyId?: string | null
  disabled?: boolean
}

const ICONS: Record<PageVisibility, React.FC<{ size: number; className?: string }>> = {
  private: Lock,
  team: Users,
  company: Building2,
  public: Globe,
}

export function PageVisibilitySelector({ value, onChange, companyId, disabled }: PageVisibilitySelectorProps) {
  const { currentCompany, companyTeams } = useCompany()
  const [open, setOpen] = useState(false)

  const current = VISIBILITY_OPTIONS.find((o) => o.value === value) || VISIBILITY_OPTIONS[0]
  const Icon = ICONS[value]

  // Filter options based on context
  const options = VISIBILITY_OPTIONS.filter((opt) => {
    if (opt.value === "team" && !companyId) return false
    if (opt.value === "company" && !companyId) return false
    return true
  })

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[11px] text-[var(--text-secondary)]"
      >
        <Icon size={12} />
        <span>{current.label}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute top-full left-0 mt-1 z-50 w-[220px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-1">
              {options.map((opt) => {
                const OptIcon = ICONS[opt.value]
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--hover)] transition-colors cursor-pointer text-left"
                  >
                    <OptIcon size={14} className="text-[var(--muted)] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[var(--text)]">{opt.label}</div>
                      <div className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                    {value === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--noska-blue)] mt-1.5 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
