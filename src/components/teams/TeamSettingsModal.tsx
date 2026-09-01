import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTeams } from "../../lib/TeamContext"
import { fetchTeamInvites } from "../../lib/teams"
import type { TeamInvite } from "../../lib/teams"
import { X, Mail, Users, Settings as SettingsIcon, Trash2, ShieldCheck, UserPlus } from "lucide-react"

interface Props {
  teamId: string
  onClose: () => void
}

export default function TeamSettingsModal({ teamId, onClose }: Props) {
  const { teams, members, updateTeam, inviteMember, removeMember, refreshTeams, refreshMembers } = useTeams()
  const team = teams.find((t) => t.id === teamId)
  const [name, setName] = useState(team?.name ?? "")
  const [description, setDescription] = useState(team?.description ?? "")
  const [icon, setIcon] = useState(team?.icon ?? "👥")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([])
  const [tab, setTab] = useState<"members" | "invites" | "settings">("members")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (team) {
      setName(team.name)
      setDescription(team.description ?? "")
      setIcon(team.icon ?? "👥")
    }
    refreshMembers()
    fetchTeamInvites(teamId).then((d) => setTeamInvites(d)).catch(() => {})
  }, [team, teamId, refreshMembers])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setStatusMsg(null)
    try {
      await updateTeam(teamId, { name: name.trim(), description: description || null, icon } as any)
      await refreshTeams()
      setStatusMsg({ type: "success", text: "Teamspace settings saved successfully!" })
    } catch (e: any) {
      console.warn("Failed to update team:", e)
      setStatusMsg({ type: "error", text: e.message || "Failed to update team settings" })
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(null), 3500)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setSending(true)
    setStatusMsg(null)
    try {
      await inviteMember(teamId, inviteEmail.trim(), inviteRole)
      const invited = inviteEmail.trim()
      setInviteEmail("")
      const invites = await fetchTeamInvites(teamId)
      setTeamInvites(invites)
      setStatusMsg({ type: "success", text: `Invitation sent to ${invited}!` })
    } catch (e: any) {
      console.warn("Failed to invite:", e)
      setStatusMsg({ type: "error", text: e.message || "Failed to send invitation" })
    } finally {
      setSending(false)
      setTimeout(() => setStatusMsg(null), 4000)
    }
  }

  const handleRemove = async (userId: string) => {
    const ok = userId === localStorage.getItem("noska_user_id")
      ? true
      : await window.noskaConfirm?.("Remove this member from the team?")
    if (ok) {
      await removeMember(teamId, userId)
    }
  }

  const currentUserId = localStorage.getItem("noska_user_id")
  const myMembership = members.find((m) => m.user_id === currentUserId)
  const canManage = myMembership?.role === "owner" || myMembership?.role === "admin"

  const TEAM_ICONS = ["👥", "💼", "🎨", "⚙️", "📊", "🚀", "🎯", "💡", "🏗️", "🤝", "📝", "🎪"]

  if (!team) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
        <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-[var(--text)]">Teamspace not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        className="w-full max-w-lg rounded-3xl bg-[var(--surface)] dark:bg-[#161a23] shadow-2xl border border-[var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)]/70 px-6 py-4 bg-[var(--surface-2)]/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-2xl shadow-xs shrink-0">
              {team.icon || "👥"}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-[var(--text)] tracking-tight truncate">{team.name}</div>
              <div className="text-xs text-[var(--muted)]">{members.length} {members.length === 1 ? "member" : "members"} · Teamspace</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Apple Segmented Control Tabs */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] gap-1">
            {(["members", "invites", "settings"] as const).map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative flex-1 py-2 text-xs font-semibold select-none cursor-pointer capitalize transition-colors duration-150 z-10 flex items-center justify-center gap-1.5 ${
                    active
                      ? "text-[var(--text)] font-bold"
                      : "text-[var(--secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="teamModalTab"
                      className="absolute inset-0 rounded-xl bg-[var(--surface)] dark:bg-[#202531] shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-[var(--border)]/80 -z-10"
                      transition={{ type: "spring", stiffness: 480, damping: 32 }}
                    />
                  )}
                  {t === "members" && <Users size={12} />}
                  {t === "invites" && <Mail size={12} />}
                  {t === "settings" && <SettingsIcon size={12} />}
                  <span>{t}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="max-h-[380px] overflow-y-auto px-6 py-4 space-y-3">
          {/* Status notification banner */}
          <AnimatePresence>
            {statusMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  statusMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                }`}
              >
                <span>{statusMsg.type === "success" ? "✓" : "⚠️"}</span>
                <span>{statusMsg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {tab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3 rounded-2xl p-2.5 bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] border border-[var(--border)]/60 transition group">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm shrink-0 shadow-2xs">
                      {member.user_avatar || "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate">
                        {member.user_name || member.user_email || member.user_id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate">{member.user_email}</div>
                    </div>
                    <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      member.role === "owner" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" :
                      member.role === "admin" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25" :
                      "bg-black/5 dark:bg-white/10 text-[var(--secondary)] border-[var(--border)]"
                    }`}>
                      {member.role}
                    </div>
                    {canManage && member.user_id !== currentUserId && (
                      <button
                        onClick={() => handleRemove(member.user_id)}
                        className="opacity-0 group-hover:opacity-100 grid h-7 w-7 place-items-center rounded-lg hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-[var(--muted)] text-center py-8">No members in this teamspace yet.</p>
                )}
              </motion.div>
            )}

            {tab === "invites" && (
              <motion.div
                key="invites"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {canManage && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]/70 space-y-2">
                    <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                      <UserPlus size={13} className="text-[var(--accent)]" />
                      <span>Invite Collaborator</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                        placeholder="collaborator@example.com..."
                        type="email"
                        className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs sm:text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] outline-none cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={handleInvite}
                        disabled={sending || !inviteEmail.trim()}
                        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-deep)] transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--secondary)]">Pending Invitations</div>
                  {teamInvites.filter((i) => i.status === "pending").map((invite) => (
                    <div key={invite.id} className="flex items-center gap-3 rounded-xl p-2.5 bg-[var(--surface-2)]/30 border border-[var(--border)] text-xs">
                      <Mail size={13} className="text-[var(--muted)]" />
                      <span className="flex-1 font-medium text-[var(--text)] truncate">{invite.invitee_email}</span>
                      <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 text-[10px] font-semibold">
                        {invite.role}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] font-medium">Pending</span>
                    </div>
                  ))}
                  {teamInvites.filter((i) => i.status === "pending").length === 0 && (
                    <div className="text-xs text-[var(--muted)] text-center py-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/20">
                      No pending invites
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {canManage ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Team Icon</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={icon}
                          onChange={(e) => setIcon(e.target.value)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2 text-xl outline-none cursor-pointer"
                        >
                          {TEAM_ICONS.map((ic) => (
                            <option key={ic} value={ic}>{ic}</option>
                          ))}
                        </select>
                        <span className="text-xs text-[var(--muted)]">Choose an emoji avatar for this teamspace</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Team Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-xs sm:text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-xs sm:text-sm text-[var(--text)] outline-none resize-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving || !name.trim()}
                      className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-deep)] py-2.5 text-xs sm:text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/30">
                    <ShieldCheck size={24} className="mx-auto text-[var(--muted)] mb-2" />
                    <p className="text-xs text-[var(--muted)]">Only team owners and admins can edit teamspace settings.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
