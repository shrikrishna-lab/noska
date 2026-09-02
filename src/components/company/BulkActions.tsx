import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckSquare, Square, Trash2, Copy, FolderInput, Lock, Unlock,
  Eye, Loader2, X, MoreHorizontal
} from "lucide-react"

interface BulkActionsProps {
  selectedIds: Set<string>
  onClearSelection: () => void
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkMove?: (ids: string[], teamId: string) => Promise<void>
  onBulkDuplicate?: (ids: string[]) => Promise<void>
  onBulkLock?: (ids: string[], locked: boolean) => Promise<void>
  teams?: { id: string; name: string; icon?: string }[]
}

export function BulkActions({
  selectedIds,
  onClearSelection,
  onBulkDelete,
  onBulkMove,
  onBulkDuplicate,
  onBulkLock,
  teams,
}: BulkActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const count = selectedIds.size
  const ids = Array.from(selectedIds)

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true)
    try { await action() } catch {}
    finally { setLoading(false); onClearSelection() }
  }

  if (count === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl"
      >
        <span className="text-[11px] font-bold text-[var(--text)] mr-2">
          {count} selected
        </span>

        <div className="h-5 w-px bg-[var(--border)]" />

        {onBulkDuplicate && (
          <button
            onClick={() => handleAction(() => onBulkDuplicate(ids))}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition text-[10px] font-semibold cursor-pointer disabled:opacity-50"
          >
            <Copy size={11} /> Duplicate
          </button>
        )}

        {onBulkLock && (
          <button
            onClick={() => handleAction(() => onBulkLock(ids, true))}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition text-[10px] font-semibold cursor-pointer disabled:opacity-50"
          >
            <Lock size={11} /> Lock
          </button>
        )}

        {onBulkMove && teams && (
          <div className="relative">
            <button
              onClick={() => setShowMove(!showMove)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition text-[10px] font-semibold cursor-pointer disabled:opacity-50"
            >
              <FolderInput size={11} /> Move
            </button>
            {showMove && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-1">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { handleAction(() => onBulkMove(ids, team.id)); setShowMove(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[11px] text-[var(--text)] transition cursor-pointer"
                  >
                    <span>{team.icon || "👥"}</span>
                    {team.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onBulkDelete && (
          <>
            <div className="h-5 w-px bg-[var(--border)]" />
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAction(() => onBulkDelete(ids))}
                  disabled={loading}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[10px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition text-[10px] font-semibold cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </>
        )}

        <div className="h-5 w-px bg-[var(--border)]" />
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] transition cursor-pointer"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export function SelectableRow({
  id,
  selected,
  onSelect,
  children,
}: {
  id: string
  selected: boolean
  onSelect: (id: string, shiftKey: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={e => onSelect(id, e.shiftKey)}
      className="flex items-center gap-2 group"
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center transition cursor-pointer ${
        selected ? "bg-[var(--accent)] text-white" : "opacity-0 group-hover:opacity-100 text-[var(--muted)]"
      }`}>
        {selected ? <CheckSquare size={13} /> : <Square size={13} />}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
