import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Users, Shield, Settings, FileText, Loader2, Check, AlertTriangle } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  updateCompany,
  deleteCompany,
  type Company,
} from "../../lib/company"
import {
  isCompanyOwner,
  isCompanyAdmin,
  canDeleteCompany,
  getVisibleSettingsTabs,
  type CompanySettingsTab,
} from "../../lib/companyAuth"
import { CompanyMembers } from "./CompanyMembers"
import { CompanyTeams } from "./CompanyTeams"
import { CompanyInvitations } from "./CompanyInvitations"
import { CompanyAuditLog } from "./CompanyAuditLog"

interface CompanySettingsProps {
  onClose: () => void
  initialTab?: CompanySettingsTab
}

const TAB_CONFIG: Record<CompanySettingsTab, { label: string; icon: React.FC<{ size: number }> }> = {
  general: { label: "General", icon: Settings },
  members: { label: "Members", icon: Users },
  teams: { label: "Teams", icon: Users },
  permissions: { label: "Permissions", icon: Shield },
  security: { label: "Security", icon: Shield },
  billing: { label: "Billing", icon: FileText },
  integrations: { label: "Integrations", icon: Settings },
  audit: { label: "Audit Log", icon: FileText },
}

export function CompanySettings({ onClose, initialTab = "general" }: CompanySettingsProps) {
  const { currentCompany, currentMember, refreshCompany } = useCompany()
  const [tab, setTab] = useState<CompanySettingsTab>(initialTab)
  const [name, setName] = useState(currentCompany?.name || "")
  const [description, setDescription] = useState(currentCompany?.description || "")
  const [logoUrl, setLogoUrl] = useState(currentCompany?.logo_url || "")
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const visibleTabs = getVisibleSettingsTabs(currentMember, currentCompany)

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name)
      setDescription(currentCompany.description)
      setLogoUrl(currentCompany.logo_url || "")
    }
  }, [currentCompany])

  const handleSaveGeneral = async () => {
    if (!currentCompany) return
    setSaving(true)
    try {
      await updateCompany(currentCompany.id, { name, description, logo_url: logoUrl || null })
      await refreshCompany()
    } catch (e) {
      console.error("Failed to update company:", e)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCompany = async () => {
    if (!currentCompany || deleteConfirmText !== currentCompany.name) return
    try {
      await deleteCompany(currentCompany.id)
      onClose()
    } catch (e) {
      console.error("Failed to delete company:", e)
    }
  }

  if (!currentCompany) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-[680px] max-h-[80vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex overflow-hidden"
      >
        {/* Sidebar */}
        <div className="w-[180px] border-r border-[var(--border)] bg-[var(--surface-2)]/50 p-2 shrink-0">
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-2 py-1.5">
            Company Settings
          </div>
          {visibleTabs.map((t) => {
            const config = TAB_CONFIG[t]
            const Icon = config.icon
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer text-left ${
                  tab === t
                    ? "bg-[var(--noska-blue)]/10 text-[var(--noska-blue)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={13} />
                {config.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
            <h2 className="text-[14px] font-semibold text-[var(--text)]">
              {TAB_CONFIG[tab]?.label}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "general" && (
              <div className="space-y-4 max-w-[400px]">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)]">Company Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--noska-blue)] transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)]">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--noska-blue)] transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)]">URL Slug</label>
                  <div className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)]">
                    /{currentCompany.slug}
                  </div>
                </div>

                <button
                  onClick={handleSaveGeneral}
                  disabled={saving || name === currentCompany.name && description === currentCompany.description && logoUrl === (currentCompany.logo_url || "")}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Changes
                </button>

                {/* Danger Zone */}
                {canDeleteCompany(currentMember, currentCompany) && (
                  <div className="mt-8 pt-4 border-t border-red-500/20">
                    <h4 className="text-[12px] font-semibold text-red-500 mb-2">Danger Zone</h4>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg text-[12px] hover:bg-red-500/5 transition-colors cursor-pointer"
                      >
                        Delete Company
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Type <span className="font-mono font-bold text-red-500">{currentCompany.name}</span> to confirm:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-red-500/30 rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-red-500 transition-colors"
                          placeholder={currentCompany.name}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}
                            className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteCompany}
                            disabled={deleteConfirmText !== currentCompany.name}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer"
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "members" && <CompanyMembers />}
            {tab === "teams" && <CompanyTeams />}
            {tab === "audit" && <CompanyAuditLog />}

            {tab === "permissions" && (
              <div className="text-center py-12 text-[12px] text-[var(--muted)]">
                Permission settings coming soon
              </div>
            )}
            {tab === "security" && (
              <div className="text-center py-12 text-[12px] text-[var(--muted)]">
                Security settings coming soon
              </div>
            )}
            {tab === "billing" && (
              <div className="text-center py-12 text-[12px] text-[var(--muted)]">
                Billing settings coming soon
              </div>
            )}
            {tab === "integrations" && (
              <div className="text-center py-12 text-[12px] text-[var(--muted)]">
                Integration settings coming soon
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
