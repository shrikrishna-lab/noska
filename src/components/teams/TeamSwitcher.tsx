import React, { useState, useRef, useEffect } from "react"
import { useTeams } from "../../lib/TeamContext"
import TeamSettingsModal from "./TeamSettingsModal"
import { Plus, Settings, Mail, X } from "lucide-react"

interface TeamSwitcherProps {
  workspaceName: string
  onView?: (view: string, options?: { openInNewTab?: boolean }) => void
}

const TEAM_ICONS = ["👥", "💼", "🎨", "⚙️", "📊", "🚀", "🎯", "💡", "🏗️", "🤝", "📝", "🎪"]

export default function TeamSwitcher({ workspaceName, onView }: TeamSwitcherProps) {
  const {
    teams, currentTeam, setCurrentTeam, pendingInvites,
    createTeam, deleteTeam, acceptInvite, declineInvite, refreshTeams, loading,
  } = useTeams()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("👥")
  const [settingsTeam, setSettingsTeam] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    } catch (e) {
      console.warn("Failed to create team:", e)
    }
  }

  return (
    <div className="space-y-1.5 select-none">
      {/* Pending Invites Banner if any */}
      {pendingInvites.length > 0 && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-2 space-y-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)]">
            <Mail size={12} />
            <span>Team Invitations ({pendingInvites.length})</span>
          </div>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between bg-[var(--surface)] p-1.5 rounded-lg border border-[var(--border)] text-xs">
              <div className="truncate min-w-0 pr-1">
                <span className="font-semibold text-[var(--text)]">{inv.teams?.name || "Teamspace"}</span>
                <span className="text-[10px] text-[var(--muted)] block">as {inv.role}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => acceptInvite(inv.id)}
                  className="bg-emerald-500 text-white rounded px-2 py-0.5 text-[10px] font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineInvite(inv.id)}
                  className="text-[var(--muted)] hover:text-[var(--text)] rounded p-0.5 text-[10px] transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Personal Workspace Option */}
      <button
        onClick={() => {
          setCurrentTeam(null)
          onView?.("library")
        }}
        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-all duration-150 cursor-pointer group border ${
          !currentTeam
            ? "bg-black/[0.055] dark:bg-white/[0.08] text-neutral-900 dark:text-white border-black/[0.04] dark:border-white/[0.06] shadow-2xs"
            : "border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-neutral-900 dark:hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-[11px] shadow-2xs shrink-0">
            🏠
          </div>
          <div className="min-w-0">
            <div className={`text-[11.5px] ${!currentTeam ? "font-medium text-neutral-900 dark:text-white" : "font-normal text-neutral-700 dark:text-neutral-200"} truncate leading-tight`}>Personal</div>
            <div className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate leading-none mt-0.5">Your workspace</div>
          </div>
        </div>
        {!currentTeam && (
          <span className="text-[8px] font-semibold text-neutral-600 dark:text-neutral-300 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded border border-black/5 dark:border-white/10 uppercase tracking-wider">
            Active
          </span>
        )}
      </button>

      {/* 2. List of Real Teamspaces */}
      {teams.map((team) => {
        const isActive = currentTeam?.id === team.id
        return (
          <div key={team.id} className="relative group/item">
            <button
              onClick={() => {
                setCurrentTeam(team)
                onView?.("teamspace")
              }}
              className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-all duration-150 cursor-pointer border ${
                isActive
                  ? "bg-black/[0.055] dark:bg-white/[0.08] text-neutral-900 dark:text-white border-black/[0.04] dark:border-white/[0.06] shadow-2xs"
                  : "border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-6">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-[11px] shadow-2xs shrink-0">
                  {team.icon || "👥"}
                </div>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-medium text-neutral-900 dark:text-white truncate leading-tight">{team.name}</div>
                  <div className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate leading-none mt-0.5">
                    {team.member_count ?? 1} members · Teamspace
                  </div>
                </div>
              </div>
              {isActive && (
                <span className="text-[8px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSettingsTeam(team.id)
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/item:grid h-5 w-5 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition cursor-pointer"
              title="Team Settings & Members"
            >
              <Settings size={11} />
            </button>
          </div>
        )
      })}

      {/* 3. Inline Create New Teamspace */}
      {creating ? (
        <div className="space-y-1.5 p-1.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-lg border border-black/[0.06] dark:border-white/[0.08] shadow-2xs mt-1">
          <div className="flex items-center gap-1.5">
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-8 h-6 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-center text-xs outline-none cursor-pointer"
            >
              {TEAM_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") setCreating(false)
              }}
              placeholder="Teamspace name..."
              className="flex-1 min-w-0 h-6 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 px-1.5 text-[11.5px] text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 focus:border-amber-500"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 h-6 rounded-md bg-amber-500 text-white text-[11px] font-semibold hover:opacity-90 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="h-6 rounded-md border border-black/10 dark:border-white/10 px-2 text-[11px] text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex min-h-[26px] h-[26px] items-center justify-start gap-2 px-2 rounded-lg text-[11.5px] font-normal text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition cursor-pointer"
        >
          <Plus size={13} className="text-amber-500 shrink-0" />
          <span>New teamspace</span>
        </button>
      )}

      {settingsTeam && (
        <TeamSettingsModal
          teamId={settingsTeam}
          onClose={() => setSettingsTeam(null)}
        />
      )}
    </div>
  )
}
