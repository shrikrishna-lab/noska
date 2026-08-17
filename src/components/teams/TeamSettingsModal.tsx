import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTeams } from "../../lib/TeamContext"
import { fetchTeamInvites } from "../../lib/teams"
import type { TeamInvite } from "../../lib/teams"

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
  const [tab, setTab] = useState<"members" | "settings" | "invites">("members")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

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
    try {
      await updateTeam(teamId, { name: name.trim(), description: description || null, icon } as any)
      await refreshTeams()
    } catch (e) {
      console.warn("Failed to update team:", e)
    }
    setSaving(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setSending(true)
    try {
      await inviteMember(teamId, inviteEmail.trim(), inviteRole)
      setInviteEmail("")
      const invites = await fetchTeamInvites(teamId)
      setTeamInvites(invites)
    } catch (e) {
      console.warn("Failed to invite:", e)
    }
    setSending(false)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="rounded-xl bg-[var(--bg-primary)] p-6 shadow-xl border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
          <p className="text-[var(--text)]">Team not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-xl bg-[var(--bg-primary)] shadow-xl border border-[var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xl">
            {team.icon || "👥"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--text)] truncate">{team.name}</div>
            <div className="text-xs text-[var(--muted)]">{members.length} members</div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex border-b border-[var(--border)]">
          {(["members", "invites", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium text-center capitalize transition ${
                tab === t
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto p-5">
          {tab === "members" && (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--hover)] transition group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-sm shrink-0">
                    {member.user_avatar || "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text)] truncate">
                      {member.user_name || member.user_email || member.user_id.slice(0, 8)}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">{member.user_email}</div>
                  </div>
                  <div className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    member.role === "owner" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                    member.role === "admin" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {member.role}
                  </div>
                  {canManage && member.user_id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded hover:bg-red-100 text-red-500 text-xs"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-[var(--muted)] text-center py-8">No members yet</p>
              )}
            </div>
          )}

          {tab === "invites" && (
            <div className="space-y-4">
              {canManage && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="Email address..."
                      type="email"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--text)] outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={sending || !inviteEmail.trim()}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                    >
                      {sending ? "..." : "Invite"}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {teamInvites.filter((i) => i.status === "pending").map((invite) => (
                  <div key={invite.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                    <span className="text-[var(--muted)]">✉️</span>
                    <span className="flex-1 text-[var(--text)]">{invite.invitee_email}</span>
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {invite.role}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">Pending</span>
                  </div>
                ))}
                {teamInvites.filter((i) => i.status === "pending").length === 0 && (
                  <p className="text-sm text-[var(--muted)] text-center py-4">No pending invites</p>
                )}
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4">
              {canManage ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">Icon</label>
                    <select
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-lg outline-none"
                    >
                      {TEAM_ICONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--muted)]">Only team owners and admins can edit team settings.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
