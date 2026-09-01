import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Loader2, Trash2, Edit2, Users } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  createCompanyTeam,
  deleteCompanyTeam,
  updateCompanyTeam,
  getCompanyTeamMembers,
  type CompanyTeam,
  type CompanyTeamMember,
} from "../../lib/company"
import { isCompanyAdmin } from "../../lib/companyAuth"

export function CompanyTeams() {
  const { currentCompany, currentMember, companyTeams, refreshTeams } = useCompany()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newIcon, setNewIcon] = useState("👥")
  const [creating, setCreating] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<Record<string, CompanyTeamMember[]>>({})
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null)

  if (!currentCompany || !currentMember) return null

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createCompanyTeam(currentCompany.id, newName.trim(), newDescription, newIcon)
      setNewName("")
      setNewDescription("")
      setNewIcon("👥")
      setShowCreate(false)
      refreshTeams()
    } catch (e) {
      console.error("Failed to create team:", e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (teamId: string) => {
    try {
      await deleteCompanyTeam(teamId)
      refreshTeams()
    } catch (e) {
      console.error("Failed to delete team:", e)
    }
  }

  const handleUpdate = async (teamId: string) => {
    if (!editName.trim()) return
    try {
      await updateCompanyTeam(teamId, { name: editName.trim() })
      setEditingTeam(null)
      refreshTeams()
    } catch (e) {
      console.error("Failed to update team:", e)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null)
      return
    }
    setExpandedTeam(teamId)
    if (!teamMembers[teamId]) {
      setLoadingMembers(teamId)
      try {
        const members = await getCompanyTeamMembers(teamId)
        setTeamMembers((prev) => ({ ...prev, [teamId]: members }))
      } catch (e) {
        console.error("Failed to load team members:", e)
      } finally {
        setLoadingMembers(null)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[var(--muted)]">
          {companyTeams.length} team{companyTeams.length !== 1 ? "s" : ""}
        </div>
        {isCompanyAdmin(currentMember, currentCompany) && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={12} />
            New Team
          </button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Team name"
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition-colors"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition-colors"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {creating && <Loader2 size={11} className="animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team List */}
      <div className="space-y-1">
        {companyTeams.length === 0 && (
          <div className="py-8 text-center text-[12px] text-[var(--muted)]">
            No teams yet. Create your first team to get started.
          </div>
        )}
        {companyTeams.map((team) => (
          <div key={team.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
              <button
                onClick={() => loadTeamMembers(team.id)}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm shrink-0">
                  {team.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {editingTeam === team.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-[var(--surface)] border border-[var(--noska-blue)] rounded text-[12px] text-[var(--text)] outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(team.id)
                          if (e.key === "Escape") setEditingTeam(null)
                        }}
                        onBlur={() => handleUpdate(team.id)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-[12px] font-medium text-[var(--text)] truncate">{team.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{team.member_count ?? 0} members</div>
                    </>
                  )}
                </div>
              </button>

              {isCompanyAdmin(currentMember, currentCompany) && editingTeam !== team.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingTeam(team.id); setEditName(team.name) }}
                    className="w-6 h-6 rounded hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="w-6 h-6 rounded hover:bg-red-500/10 flex items-center justify-center text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* Team Members (expanded) */}
            <AnimatePresence>
              {expandedTeam === team.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-[var(--border)]"
                >
                  <div className="p-2 space-y-0.5">
                    {loadingMembers === team.id ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 size={12} className="animate-spin text-[var(--muted)]" />
                      </div>
                    ) : (teamMembers[team.id] || []).length === 0 ? (
                      <div className="py-3 text-center text-[11px] text-[var(--muted)]">
                        No members in this team
                      </div>
                    ) : (
                      (teamMembers[team.id] || []).map((tm) => {
                        const m = tm.member
                        return (
                        <div key={tm.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                          <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-medium overflow-hidden">
                            {m?.user_profiles?.avatar_url ? (
                              <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              ((m?.user_profiles?.user_name) || m?.user_id || tm.id).slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--text)] truncate">
                            {m?.user_profiles?.user_name || m?.user_id || "Unknown"}
                          </span>
                          <span className="text-[9px] text-[var(--muted)] capitalize ml-auto">
                            {tm.role}
                          </span>
                        </div>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
