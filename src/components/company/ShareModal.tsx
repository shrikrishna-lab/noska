import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Share2, X, Loader2, Users, UserPlus, Link as LinkIcon,
  Globe, Lock, Hash, Copy, Check, Trash2, Shield, Eye, Edit2
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { getCompanyMembers, type OrganizationMember } from "../../lib/company"

interface SharePermission {
  user_id: string
  permission: "view" | "edit" | "comment"
  user_name?: string
  user_email?: string
  user_avatar?: string
}

interface ShareModalProps {
  pageId: string
  pageTitle: string
  currentVisibility: string
  open: boolean
  onClose: () => void
}

export function ShareModal({ pageId, pageTitle, currentVisibility, open, onClose }: ShareModalProps) {
  const { currentCompany, currentMember } = useCompany()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [permissions, setPermissions] = useState<SharePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState(currentVisibility)

  useEffect(() => {
    if (!open || !currentCompany) return
    const fetchAll = async () => {
      setLoading(true)
      try {
        const memberList = await getCompanyMembers(currentCompany.id)
        setMembers(memberList)

        // Fetch existing permissions
        const { data } = await (supabase as any)
          .from("page_permissions")
          .select("*")
          .eq("page_id", pageId)

        if (data) {
          const userIds = data.map((p: any) => p.user_id)
          const enriched = memberList
            .filter(m => userIds.includes(m.user_id))
            .map(m => ({
              user_id: m.user_id,
              permission: data.find((p: any) => p.user_id === m.user_id)?.permission || "view",
              user_name: m.user_profiles?.user_name,
              user_email: m.user_profiles?.email,
              user_avatar: m.user_profiles?.avatar_url,
            }))
          setPermissions(enriched)
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetchAll()
  }, [open, currentCompany, pageId])

  const handleAddPerson = async (userId: string, permission: "view" | "edit" | "comment") => {
    setSaving(true)
    try {
      await supabase.from("page_permissions" as any).upsert({
        page_id: pageId,
        user_id: userId,
        permission,
      } as any)

      const member = members.find(m => m.user_id === userId)
      setPermissions(prev => [
        ...prev.filter(p => p.user_id !== userId),
        {
          user_id: userId,
          permission,
          user_name: member?.user_profiles?.user_name,
          user_email: member?.user_profiles?.email,
          user_avatar: member?.user_profiles?.avatar_url,
        }
      ])
    } catch {}
    finally { setSaving(false) }
  }

  const handleRemovePermission = async (userId: string) => {
    setSaving(true)
    try {
      await supabase
        .from("page_permissions" as any)
        .delete()
        .eq("page_id", pageId)
        .eq("user_id", userId)
      setPermissions(prev => prev.filter(p => p.user_id !== userId))
    } catch {}
    finally { setSaving(false) }
  }

  const handleVisibilityChange = async (v: string) => {
    setVisibility(v)
    try {
      await supabase
        .from("pages" as any)
        .update({ visibility: v } as any)
        .eq("id", pageId)
    } catch {}
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredMembers = members.filter(m =>
    !permissions.some(p => p.user_id === m.user_id) &&
    (search === "" ||
      m.user_profiles?.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user_profiles?.email?.toLowerCase().includes(search.toLowerCase()))
  )

  const visIcon = visibility === "private" ? <Lock size={12} /> :
    visibility === "team" ? <Hash size={12} /> :
    visibility === "public" ? <Globe size={12} /> : <Eye size={12} />

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="fixed z-[191] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <Share2 size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Share "{pageTitle}"</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Visibility */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Visibility</label>
                <div className="flex gap-2">
                  {[
                    { value: "private", label: "Private", icon: Lock, desc: "Only you" },
                    { value: "company", label: "Company", icon: Eye, desc: "All members" },
                    { value: "team", label: "Team", icon: Hash, desc: "Team members" },
                    { value: "public", label: "Public", icon: Globe, desc: "Anyone" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleVisibilityChange(opt.value)}
                      className={`flex-1 p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        visibility === opt.value
                          ? "border-[var(--accent)] bg-[var(--accent)]/5"
                          : "border-[var(--border)] hover:border-[var(--accent)]/50"
                      }`}
                    >
                      <opt.icon size={14} className={`mx-auto mb-1 ${visibility === opt.value ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                      <p className="text-[11px] font-semibold text-[var(--text)]">{opt.label}</p>
                      <p className="text-[9px] text-[var(--muted)]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copy link */}
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition cursor-pointer"
              >
                {copied ? <Check size={13} className="text-green-500" /> : <LinkIcon size={13} className="text-[var(--muted)]" />}
                <span className="text-[11px] text-[var(--text)]">{copied ? "Copied!" : "Copy link"}</span>
              </button>

              {/* Add people */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Add people</label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 mb-2"
                />
                {search && filteredMembers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {filteredMembers.slice(0, 5).map(m => (
                      <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)]">
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[8px] font-bold overflow-hidden">
                          {m.user_profiles?.avatar_url ? (
                            <img src={m.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (m.user_profiles?.user_name || "?").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[var(--text)] truncate">{m.user_profiles?.user_name}</p>
                          <p className="text-[9px] text-[var(--muted)] truncate">{m.user_profiles?.email}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleAddPerson(m.user_id, "view")} className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition cursor-pointer">View</button>
                          <button onClick={() => handleAddPerson(m.user_id, "edit")} className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition cursor-pointer">Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current permissions */}
              {permissions.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">People with access</label>
                  <div className="space-y-0.5">
                    {permissions.map(p => (
                      <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)]">
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[8px] font-bold overflow-hidden">
                          {p.user_avatar ? (
                            <img src={p.user_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (p.user_name || "?").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[var(--text)] truncate">{p.user_name}</p>
                          <p className="text-[9px] text-[var(--muted)] truncate">{p.user_email}</p>
                        </div>
                        <select
                          value={p.permission}
                          onChange={e => handleAddPerson(p.user_id, e.target.value as any)}
                          className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] cursor-pointer"
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                          <option value="comment">Comment</option>
                        </select>
                        <button
                          onClick={() => handleRemovePermission(p.user_id)}
                          className="p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
