import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Hash, Palette, FileText, Users, Loader2, Save,
  Trash2, Settings, Globe, Lock, Eye
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import {
  updateCompanyTeam, deleteCompanyTeam,
  writeAuditLog, type OrgTeam
} from "../../lib/company"
import { isCompanyAdmin } from "../../lib/companyAuth"

const TEAM_ICONS = ["⚡", "🚀", "💡", "🎯", "🔥", "⭐", "🎨", "🔧", "📊", "🧪", "🛡️", "🌐", "📱", "💻", "🤖", "👾"]
const TEAM_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280"
]

interface TeamSettingsProps {
  team: OrgTeam
  open: boolean
  onClose: () => void
  onUpdated?: () => void
  onDeleted?: () => void
}

export function TeamSettings({ team, open, onClose, onUpdated, onDeleted }: TeamSettingsProps) {
  const { currentCompany, currentMember } = useCompany()
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description || "")
  const [icon, setIcon] = useState(team.icon || "⚡")
  const [color, setColor] = useState(team.color || "#6366f1")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeTab, setActiveTab] = useState<"general" | "danger">("general")

  const canEdit = isCompanyAdmin(currentMember, currentCompany!)
  const hasChanges = name !== team.name || description !== (team.description || "") ||
    icon !== (team.icon || "⚡") || color !== (team.color || "#6366f1")

  const handleSave = async () => {
    if (!name.trim() || !canEdit) return
    setSaving(true)
    try {
      await updateCompanyTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color,
      })
      if (currentMember) {
        await writeAuditLog(currentCompany!.id, currentMember.user_id, "update", "company_teams", team.id)
      }
      onUpdated?.()
      onClose()
    } catch {}
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!canEdit) return
    setDeleting(true)
    try {
      await deleteCompanyTeam(team.id)
      if (currentMember) {
        await writeAuditLog(currentCompany!.id, currentMember.user_id, "delete", "company_teams", team.id)
      }
      onDeleted?.()
      onClose()
    } catch {}
    finally { setDeleting(false) }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed z-[181] inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] md:max-h-[85vh] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Team Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  activeTab === "general"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                General
              </button>
              {canEdit && (
                <button
                  onClick={() => setActiveTab("danger")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    activeTab === "danger"
                      ? "bg-red-500 text-white"
                      : "text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10"
                  }`}
                >
                  Danger Zone
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "general" && (
                <div className="space-y-5">
                  {/* Icon */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Icon</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEAM_ICONS.map(i => (
                        <button
                          key={i}
                          onClick={() => setIcon(i)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer ${
                            icon === i
                              ? "bg-[var(--accent)]/10 border-2 border-[var(--accent)]"
                              : "bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/50"
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEAM_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={`w-7 h-7 rounded-full transition cursor-pointer ${
                            color === c ? "ring-2 ring-offset-2 ring-[var(--surface)]" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                      placeholder="Team name"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
                      placeholder="What does this team do?"
                    />
                  </div>

                  {/* Preview */}
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Preview</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{icon}</span>
                      <div>
                        <div className="text-[13px] font-bold" style={{ color }}>{name || "Team Name"}</div>
                        {description && <div className="text-[11px] text-[var(--muted)]">{description}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "danger" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                    <h4 className="text-[13px] font-bold text-red-500 mb-1">Delete Team</h4>
                    <p className="text-[11px] text-[var(--muted)] mb-3">
                      This will permanently delete "{team.name}" and remove all members from it. This action cannot be undone.
                    </p>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition cursor-pointer"
                      >
                        <Trash2 size={11} />
                        Delete Team
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                        >
                          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[11px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === "general" && canEdit && (
              <div className="px-5 py-3 border-t border-[var(--border)]/70 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--hover)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges || !name.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save Changes
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
