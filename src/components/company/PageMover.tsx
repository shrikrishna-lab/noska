import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FolderInput, Loader2, ChevronRight, Check, X, Building2, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyTeams, writeAuditLog, type OrgTeam } from "../../lib/company"

interface PageMoverProps {
  pageId: string
  currentTeamId?: string | null
  onMoved?: (newTeamId: string | null) => void
  size?: "sm" | "md"
}

export function PageMover({ pageId, currentTeamId, onMoved, size = "md" }: PageMoverProps) {
  const { currentCompany, currentMember } = useCompany()
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !currentCompany) return
    const fetchTeams = async () => {
      setFetching(true)
      try {
        const data = await getCompanyTeams(currentCompany.id)
        setTeams(data)
      } catch { setTeams([]) }
      finally { setFetching(false) }
    }
    fetchTeams()
  }, [open, currentCompany])

  const handleMove = async (teamId: string | null) => {
    setLoading(true)
    try {
      await supabase
        .from("pages" as any)
        .update({ team_id: teamId } as any)
        .eq("id", pageId)

      if (currentMember) {
        await writeAuditLog(
          currentCompany!.id,
          currentMember.user_id,
          "move",
          "pages",
          { entity_id: pageId, from_team: currentTeamId, to_team: teamId }
        )
      }

      onMoved?.(teamId)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8"
  const iconSize = size === "sm" ? 12 : 14

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${btnSize} rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer`}
        title="Move page"
      >
        <FolderInput size={iconSize} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute right-0 top-full mt-1 z-50 w-60 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-[var(--border)]/70">
                <p className="text-[11px] font-bold text-[var(--text)]">Move to</p>
              </div>
              <div className="p-1 max-h-60 overflow-y-auto">
                {/* No team */}
                <button
                  onClick={() => handleMove(null)}
                  disabled={loading || currentTeamId === null}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer disabled:opacity-50"
                >
                  <Building2 size={13} className="text-[var(--muted)]" />
                  <span className="flex-1 text-[12px] text-[var(--text)]">Workspace root</span>
                  {currentTeamId === null && <Check size={12} className="text-[var(--accent)]" />}
                </button>

                {fetching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
                  </div>
                ) : (
                  teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleMove(team.id)}
                      disabled={loading || currentTeamId === team.id}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-2)] transition text-left cursor-pointer disabled:opacity-50"
                    >
                      <span className="text-sm">{team.icon || "👥"}</span>
                      <span className="flex-1 text-[12px] text-[var(--text)] truncate">{team.name}</span>
                      {currentTeamId === team.id && <Check size={12} className="text-[var(--accent)]" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
