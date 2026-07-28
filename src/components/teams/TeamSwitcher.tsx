import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTeams } from "../../lib/TeamContext"
import { useOutsideDismiss } from "../ui"
import TeamSettingsModal from "./TeamSettingsModal"

interface TeamSwitcherProps {
  workspaceName: string
  onView?: (view: string) => void
}

const TEAM_ICONS = ["👥", "💼", "🎨", "⚙️", "📊", "🚀", "🎯", "💡", "🏗️", "🤝", "📝", "🎪"]

export default function TeamSwitcher({ workspaceName, onView }: TeamSwitcherProps) {
  const {
    teams, currentTeam, setCurrentTeam, pendingInvites,
    createTeam, deleteTeam, refreshTeams, loading,
  } = useTeams()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("👥")
  const [settingsTeam, setSettingsTeam] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useOutsideDismiss(ref, () => { setOpen(false); setCreating(false) })

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus()
  }, [creating])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createTeam(newName.trim(), "", newIcon)
      setNewName("")
      setNewIcon("👥")
      setCreating(false)
      setOpen(false)
    } catch (e) {
      console.warn("Failed to create team:", e)
    }
  }

  const handleDelete = async (teamId: string) => {
    const ok = await window.noskaConfirm?.("Delete this team? All members will be removed.")
    if (ok) {
      await deleteTeam(teamId)
    }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--hover)] transition text-left group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm shrink-0">
            {currentTeam ? currentTeam.icon || "👥" : "🏠"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text)] truncate leading-none">
              {currentTeam ? currentTeam.name : "Personal"}
            </div>
            <div className="text-[9px] text-[var(--muted)] truncate mt-0.5">
              {currentTeam ? `${currentTeam.member_count ?? 0} members` : "Your workspace"}
            </div>
          </div>
          {pendingInvites.length > 0 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {pendingInvites.length}
            </div>
          )}
          <svg className="h-3 w-3 text-[var(--muted)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute bottom-full left-0 mb-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--sidebar)] shadow-xl z-50 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Teams</div>
              </div>

              <div className="py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setCurrentTeam(null); setOpen(false) }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--hover)] transition ${!currentTeam ? "bg-[var(--active)]" : ""}`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm">🏠</div>
                  <div>
                    <div className="font-medium text-[var(--text)]">Personal</div>
                    <div className="text-[10px] text-[var(--muted)]">{workspaceName}</div>
                  </div>
                </button>

                {teams.map((team) => (
                  <div key={team.id} className="group/item relative">
                    <button
                      onClick={() => { setCurrentTeam(team); setOpen(false); onView?.("teamspace") }}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--hover)] transition ${currentTeam?.id === team.id ? "bg-[var(--active)]" : ""}`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm">
                        {team.icon || "👥"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text)] truncate">{team.name}</div>
                        <div className="text-[10px] text-[var(--muted)]">{team.member_count ?? 0} members</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setSettingsTeam(team.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/item:flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--surface-2)] text-[var(--muted)]"
                      title="Team settings"
                    >
                      ⚙️
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border)] p-2">
                {creating ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={newIcon}
                        onChange={(e) => setNewIcon(e.target.value)}
                        className="w-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-center text-lg outline-none"
                      >
                        {TEAM_ICONS.map((ic) => (
                          <option key={ic} value={ic}>{ic}</option>
                        ))}
                      </select>
                      <input
                        ref={inputRef}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false) }}
                        placeholder="Team name..."
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreate} className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-sm font-medium text-white hover:opacity-90 transition">
                        Create
                      </button>
                      <button onClick={() => setCreating(false)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--hover)] transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition"
                  >
                    <span className="text-lg leading-none">+</span>
                    <span>Create team</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {settingsTeam && (
        <TeamSettingsModal
          teamId={settingsTeam}
          onClose={() => setSettingsTeam(null)}
        />
      )}
    </>
  )
}
