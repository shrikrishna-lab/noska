import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutGrid, List, Calendar, Kanban, Columns, ArrowUpDown,
  Filter, Plus, Search, Loader2, ChevronDown, X
} from "lucide-react"

type ViewType = "table" | "board" | "calendar" | "gallery"

interface DatabaseField {
  key: string
  label: string
  type: "text" | "number" | "select" | "date" | "checkbox" | "url"
  options?: string[]
}

interface DatabaseViewsProps {
  data: Record<string, any>[]
  fields: DatabaseField[]
  onViewChange?: (view: ViewType) => void
  onAddRow?: () => void
  onRowClick?: (row: Record<string, any>) => void
}

export function DatabaseViews({ data, fields, onViewChange, onAddRow, onRowClick }: DatabaseViewsProps) {
  const [view, setView] = useState<ViewType>("table")
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filterField, setFilterField] = useState<string>("")
  const [filterValue, setFilterValue] = useState("")
  const [boardGroupBy, setBoardGroupBy] = useState<string>(fields[0]?.key || "")

  const filteredData = useMemo(() => {
    let result = [...data]

    // Search
    if (search) {
      result = result.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(search.toLowerCase())
        )
      )
    }

    // Filter
    if (filterField && filterValue) {
      result = result.filter(row =>
        String(row[filterField]).toLowerCase().includes(filterValue.toLowerCase())
      )
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField] || ""
        const bVal = b[sortField] || ""
        const cmp = String(aVal).localeCompare(String(bVal))
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [data, search, sortField, sortDir, filterField, filterValue])

  const groupedData = useMemo(() => {
    if (view !== "board") return {}
    const groups: Record<string, Record<string, any>[]> = {}
    filteredData.forEach(row => {
      const key = String(row[boardGroupBy] || "No Status")
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    })
    return groups
  }, [filteredData, view, boardGroupBy])

  const calendarData = useMemo(() => {
    if (view !== "calendar") return {}
    const dateField = fields.find(f => f.type === "date")
    if (!dateField) return {}
    const groups: Record<string, Record<string, any>[]> = {}
    filteredData.forEach(row => {
      const date = row[dateField.key]
      if (date) {
        const key = new Date(date).toLocaleDateString()
        if (!groups[key]) groups[key] = []
        groups[key].push(row)
      }
    })
    return groups
  }, [filteredData, view, fields])

  const handleViewChange = (v: ViewType) => {
    setView(v)
    onViewChange?.(v)
  }

  const toggleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View tabs */}
        <div className="flex bg-[var(--surface-2)] rounded-xl p-0.5 border border-[var(--border)]">
          {[
            { type: "table" as ViewType, icon: List, label: "Table" },
            { type: "board" as ViewType, icon: Kanban, label: "Board" },
            { type: "calendar" as ViewType, icon: Calendar, label: "Calendar" },
            { type: "gallery" as ViewType, icon: LayoutGrid, label: "Gallery" },
          ].map(opt => (
            <button
              key={opt.type}
              onClick={() => handleViewChange(opt.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                view === opt.type
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <opt.icon size={12} />
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-[var(--border)]" />

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
          <Search size={11} className="text-[var(--muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="bg-transparent text-[10px] text-[var(--text)] focus:outline-none w-24"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[var(--muted)] cursor-pointer">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Board group by */}
        {view === "board" && (
          <select
            value={boardGroupBy}
            onChange={e => setBoardGroupBy(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text)] cursor-pointer"
          >
            {fields.map(f => (
              <option key={f.key} value={f.key}>Group by {f.label}</option>
            ))}
          </select>
        )}

        <button
          onClick={onAddRow}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold hover:bg-[var(--accent-deep)] transition cursor-pointer"
        >
          <Plus size={11} /> New
        </button>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                {fields.map(f => (
                  <th
                    key={f.key}
                    onClick={() => toggleSort(f.key)}
                    className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] cursor-pointer hover:bg-[var(--surface-3)] transition"
                  >
                    <span className="flex items-center gap-1">
                      {f.label}
                      {sortField === f.key && (
                        <ArrowUpDown size={9} className="text-[var(--accent)]" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-2)]/50 transition cursor-pointer"
                >
                  {fields.map(f => (
                    <td key={f.key} className="px-3 py-2 text-[11px] text-[var(--text)]">
                      {renderCell(row[f.key], f)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-[11px] text-[var(--muted)]">No rows</div>
          )}
        </div>
      )}

      {/* Board View */}
      {view === "board" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.entries(groupedData).map(([group, rows]) => (
            <div key={group} className="w-64 shrink-0">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                <span className="text-[11px] font-bold text-[var(--text)]">{group}</span>
                <span className="text-[10px] text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">{rows.length}</span>
              </div>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition cursor-pointer"
                    onClick={() => onRowClick?.(row)}
                  >
                    {fields.slice(0, 3).map(f => (
                      <div key={f.key} className="text-[11px] text-[var(--text)]">
                        {renderCell(row[f.key], f)}
                      </div>
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden border border-[var(--border)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="bg-[var(--surface-2)] px-2 py-1.5 text-[9px] font-bold uppercase text-[var(--muted)]">
              {d}
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - date.getDay() + i)
            const key = date.toLocaleDateString()
            const rows = calendarData[key] || []
            return (
              <div key={i} className="bg-[var(--surface)] p-1.5 min-h-[60px]">
                <span className="text-[9px] text-[var(--muted)]">{date.getDate()}</span>
                {rows.slice(0, 2).map((row, j) => (
                  <div key={j} className="text-[9px] text-[var(--accent)] truncate mt-0.5 cursor-pointer" onClick={() => onRowClick?.(row)}>
                    {Object.values(row)[0] ? String(Object.values(row)[0]).slice(0, 15) : "—"}
                  </div>
                ))}
                {rows.length > 2 && (
                  <span className="text-[8px] text-[var(--muted)]">+{rows.length - 2} more</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Gallery View */}
      {view === "gallery" && (
        <div className="grid grid-cols-3 gap-3">
          {filteredData.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {fields.slice(0, 4).map(f => (
                <div key={f.key} className="mb-1">
                  <span className="text-[9px] text-[var(--muted)]">{f.label}: </span>
                  <span className="text-[11px] text-[var(--text)]">{renderCell(row[f.key], f)}</span>
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function renderCell(value: any, field: DatabaseField) {
  if (value === null || value === undefined) return <span className="text-[var(--muted)]">—</span>

  switch (field.type) {
    case "checkbox":
      return <span className={value ? "text-green-500" : "text-[var(--muted)]"}>{value ? "✓" : "—"}</span>
    case "select":
      return (
        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-medium">
          {String(value)}
        </span>
      )
    case "url":
      return <a href={value} target="_blank" rel="noopener" className="text-[var(--accent)] hover:underline">{String(value).slice(0, 30)}</a>
    case "date":
      return <span className="text-[10px]">{new Date(value).toLocaleDateString()}</span>
    default:
      return <span>{String(value).slice(0, 50)}</span>
  }
}
