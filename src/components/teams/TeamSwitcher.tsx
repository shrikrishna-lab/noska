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
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer group border ${
          !currentTeam
            ? "bg-[var(--surface-2)] text-[var(--text)] shadow-xs border-[var(--border-strong)]"
            : "border-transparent text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--border)]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-xs shadow-xs shrink-0">
            🏠
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--text)] truncate leading-tight">Personal</div>
            <div className="text-[9.5px] text-[var(--muted)] truncate">Your workspace</div>
          </div>
        </div>
        {!currentTeam && (
          <span className="text-[9.5px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-md border border-[var(--accent)]/20">
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                isActive
                  ? "bg-[var(--surface-2)] text-[var(--text)] shadow-xs border-[var(--border-strong)]"
                  : "border-transparent text-[var(--text)] hover:bg-[var(--hover)] hover:border-[var(--border)]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-6">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-xs shadow-xs shrink-0">
                  {team.icon || "👥"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text)] truncate leading-tight">{team.name}</div>
                  <div className="text-[9.5px] text-[var(--muted)] truncate">
                    {team.member_count ?? 1} members · Teamspace
                  </div>
                </div>
              </div>
              {isActive && (
                <span className="text-[9.5px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-md border border-[var(--accent)]/20">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSettingsTeam(team.id)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/item:grid h-6 w-6 place-items-center rounded-lg hover:bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="Team Settings & Members"
            >
              <Settings size={12} />
            </button>
          </div>
        )
      })}

      {/* 3. Inline Create New Teamspace */}
      {creating ? (
        <div className="space-y-2 p-2 bg-[var(--surface)] rounded-xl border border-[var(--border-strong)] shadow-xs mt-1">
          <div className="flex items-center gap-1.5">
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-9 h-7 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center text-xs outline-none cursor-pointer"
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
              className="flex-1 min-w-0 h-7 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 h-7 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="h-7 rounded-lg border border-[var(--border)] px-2.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-start gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
        >
          <Plus size={13} className="text-[var(--accent)]" />
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
