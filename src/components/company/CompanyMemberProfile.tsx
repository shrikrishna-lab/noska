import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Mail, Building2, Calendar, MapPin, Briefcase, Shield,
  Users, Loader2, ExternalLink
} from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  getCompanyTeams, getCompanyTeamMembers,
  type OrganizationMember, type OrgTeam
} from "../../lib/company"
import { getRoleBadge } from "../../lib/companyAuth"

interface CompanyMemberProfileProps {
  member: OrganizationMember | null
  open: boolean
  onClose: () => void
}

export function CompanyMemberProfile({ member, open, onClose }: CompanyMemberProfileProps) {
  const { currentCompany } = useCompany()
  const [memberTeams, setMemberTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !member || !currentCompany) return
    const fetchTeams = async () => {
      setLoading(true)
      try {
        const teams = await getCompanyTeams(currentCompany.id)
        const memberTeamsList: OrgTeam[] = []
        for (const team of teams) {
          const members = await getCompanyTeamMembers(team.id)
          if (members.some(m => m.organization_member_id === member.id)) {
            memberTeamsList.push(team)
          }
        }
        setMemberTeams(memberTeamsList)
      } catch { setMemberTeams([]) }
      finally { setLoading(false) }
    }
    fetchTeams()
  }, [open, member, currentCompany])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onClose])

  if (!open || !member) return null

  const badge = getRoleBadge(member.job_title)
  const isOwner = member.user_id === currentCompany?.created_by
  const profile = member.user_profiles

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150]"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed z-[151] w-[320px] bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ top: "20%", left: "50%", transform: "translateX(-50%)" }}
          >
            {/* Header */}
            <div className="relative px-5 pt-5 pb-4">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-6 h-6 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer"
              >
                <X size={13} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-bold text-[var(--text)] overflow-hidden shadow-xs">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.user_name || member.user_id).slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">
                    {profile?.user_name || "Unknown"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color} bg-[var(--surface-2)] border border-[var(--border)]`}>
                      {badge.label}
                    </span>
                    {isOwner && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-amber-600 bg-amber-500/10 border border-amber-500/20">
                        Owner
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 pb-5 space-y-3">
              {/* Email */}
              {profile?.email && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Mail size={13} className="text-[var(--muted)]" />
                  <a href={`mailto:${profile.email}`} className="text-[var(--accent)] hover:underline truncate">
                    {profile.email}
                  </a>
                </div>
              )}

              {/* Job Title */}
              <div className="flex items-center gap-2.5 text-xs">
                <Briefcase size={13} className="text-[var(--muted)]" />
                <span className="text-[var(--text)]">{member.job_title}</span>
              </div>

              {/* Location */}
              {member.location && (
                <div className="flex items-center gap-2.5 text-xs">
                  <MapPin size={13} className="text-[var(--muted)]" />
                  <span className="text-[var(--text)]">{member.location}</span>
                </div>
              )}

              {/* Joined */}
              <div className="flex items-center gap-2.5 text-xs">
                <Calendar size={13} className="text-[var(--muted)]" />
                <span className="text-[var(--text)]">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${member.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-[var(--text)] capitalize">{member.status}</span>
              </div>

              {/* Teams */}
              <div className="pt-2 border-t border-[var(--border)]/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users size={12} className="text-[var(--muted)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Teams</span>
                </div>
                {loading ? (
                  <Loader2 size={12} className="animate-spin text-[var(--muted)]" />
                ) : memberTeams.length === 0 ? (
                  <span className="text-[11px] text-[var(--muted)]">No team assigned</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {memberTeams.map(team => (
                      <span
                        key={team.id}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
                      >
                        {team.icon} {team.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
