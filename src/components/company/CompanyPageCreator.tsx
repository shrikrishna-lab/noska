import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Plus, X, Loader2, Lock, Users, Building2, Globe,
  Sparkles, BookOpen, Clipboard, Layout, Newspaper, Briefcase
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { setPageVisibility, type OrgTeam } from "../../lib/company"

interface CompanyPageCreatorProps {
  open: boolean
  onClose: () => void
  onPageCreated: (pageId: string) => void
  teams: OrgTeam[]
}

const TEMPLATES = [
  {
    id: "blank",
    name: "Blank Page",
    icon: FileText,
    description: "Start from scratch",
    color: "text-gray-500 bg-gray-500/10",
    blocks: [],
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    icon: Newspaper,
    description: "Structured meeting template",
    color: "text-blue-500 bg-blue-500/10",
    blocks: [
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Meeting Notes" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "**Date:** " + new Date().toLocaleDateString() }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "**Attendees:** " }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Agenda" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Action Items" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Notes" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "" }, createdTime: Date.now(), lastEditedTime: Date.now() },
    ],
  },
  {
    id: "project-brief",
    name: "Project Brief",
    icon: Briefcase,
    description: "Project overview template",
    color: "text-orange-500 bg-orange-500/10",
    blocks: [
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Project Brief" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Overview" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "Describe the project goal and scope." }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Objectives" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Timeline" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "**Start:** — **End:** —" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Stakeholders" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "" }, createdTime: Date.now(), lastEditedTime: Date.now() },
    ],
  },
  {
    id: "team-wiki",
    name: "Team Wiki",
    icon: BookOpen,
    description: "Knowledge base page",
    color: "text-purple-500 bg-purple-500/10",
    blocks: [
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Team Wiki" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "Central knowledge base for the team." }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Getting Started" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Resources" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "heading", properties: { text: "FAQ" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "text", properties: { text: "" }, createdTime: Date.now(), lastEditedTime: Date.now() },
    ],
  },
  {
    id: "checklist",
    name: "Checklist",
    icon: Clipboard,
    description: "Task checklist",
    color: "text-green-500 bg-green-500/10",
    blocks: [
      { id: crypto.randomUUID(), type: "heading", properties: { text: "Checklist" }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
      { id: crypto.randomUUID(), type: "todo", properties: { text: "", checked: false }, createdTime: Date.now(), lastEditedTime: Date.now() },
    ],
  },
]

const VISIBILITY_OPTIONS = [
  { value: "private" as const, label: "Private", icon: Lock, description: "Only you" },
  { value: "company" as const, label: "Company", icon: Building2, description: "All members" },
  { value: "team" as const, label: "Team", icon: Users, description: "Team members" },
  { value: "public" as const, label: "Public", icon: Globe, description: "Anyone with link" },
]

export function CompanyPageCreator({ open, onClose, onPageCreated, teams }: CompanyPageCreatorProps) {
  const { currentCompany } = useCompany()
  const [title, setTitle] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("blank")
  const [visibility, setVisibility] = useState<"private" | "company" | "team" | "public">("company")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !currentCompany) return
    setCreating(true)
    try {
      const userId = localStorage.getItem("noska_user_id") || ""
      const template = TEMPLATES.find(t => t.id === selectedTemplate)
      const pageId = crypto.randomUUID()

      const { error } = await supabase.from("pages" as any).insert({
        id: pageId,
        title: title.trim(),
        icon: "📝",
        user_id: userId,
        organization_id: currentCompany.id,
        team_id: visibility === "team" && selectedTeamId ? selectedTeamId : null,
        visibility,
        blocks: template?.blocks || [],
        tags: [],
        parent_id: null,
        favorite: false,
        trashed: false,
        workspace_id: "",
      } as any)
      if (error) throw error

      setTitle("")
      setSelectedTemplate("blank")
      setVisibility("company")
      onClose()
      onPageCreated(pageId)
    } catch (e) {
      console.error("Failed to create page:", e)
    } finally {
      setCreating(false)
    }
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
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed top-[12%] left-1/2 -translate-x-1/2 z-[151] w-full max-w-[560px]"
          >
            <div className="bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                    <Plus size={16} className="text-[var(--accent)]" />
                  </div>
                  <h2 className="text-sm font-bold text-[var(--text)]">New Page</h2>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled"
                    className="w-full text-lg font-bold text-[var(--text)] placeholder:text-[var(--muted)] bg-transparent outline-none border-b border-[var(--border)]/60 pb-2 focus:border-[var(--accent)] transition-colors"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Template</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedTemplate === tmpl.id
                            ? "border-[var(--accent)]/40 bg-[var(--accent)]/5 shadow-xs"
                            : "border-[var(--border)]/60 hover:border-[var(--border)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tmpl.color}`}>
                          <tmpl.icon size={14} />
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--text)]">{tmpl.name}</div>
                        <div className="text-[9px] text-[var(--muted)] mt-0.5">{tmpl.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Visibility</label>
                  <div className="flex gap-2">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          visibility === opt.value
                            ? "border-[var(--accent)]/40 bg-[var(--accent)]/5 shadow-xs"
                            : "border-[var(--border)]/60 hover:border-[var(--border)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        <opt.icon size={13} className={visibility === opt.value ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--text)]">{opt.label}</div>
                          <div className="text-[9px] text-[var(--muted)]">{opt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Selection (if team visibility) */}
                {visibility === "team" && teams.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">Assign to Team</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]/60 rounded-xl text-xs text-[var(--text)] outline-none cursor-pointer"
                    >
                      <option value="">Select team...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Create Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleCreate}
                    disabled={!title.trim() || creating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {creating && <Loader2 size={12} className="animate-spin" />}
                    Create Page
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
