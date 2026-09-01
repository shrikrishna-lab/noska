import React from "react"
import { motion } from "framer-motion"
import { ChevronRight, Home, Building2 } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
}

interface CompanyBreadcrumbProps {
  items: BreadcrumbItem[]
}

export function CompanyBreadcrumb({ items }: CompanyBreadcrumbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 px-4 py-2 text-[11px] font-medium text-[var(--muted)] overflow-x-auto scrollbar-none"
    >
      <Home size={12} className="shrink-0" />
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={10} className="shrink-0 opacity-40" />
          <button
            onClick={item.onClick}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md whitespace-nowrap transition ${
              item.onClick
                ? "hover:bg-[var(--surface-2)] hover:text-[var(--text)] cursor-pointer"
                : "text-[var(--text)] cursor-default"
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </motion.div>
  )
}
