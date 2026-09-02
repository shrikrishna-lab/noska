import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutGrid, FileText, Loader2, Eye, Copy, Star, ChevronRight, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { getOrgPages, type OrgPage } from "../../lib/company"

interface Template {
  id: string
  title: string
  icon: string | null
  blocks: any[]
  created_at?: string
}

interface TemplatesGalleryProps {
  open: boolean
  onClose: () => void
  onUseTemplate?: (blocks: any[], title: string) => void
}

export function TemplatesGallery({ open, onClose, onUseTemplate }: TemplatesGalleryProps) {
  const { currentCompany } = useCompany()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<Template | null>(null)

  useEffect(() => {
    if (!open || !currentCompany) return
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from("pages" as any)
          .select("id, title, icon, blocks, created_at, organization_id, is_template")
          .eq("organization_id", currentCompany.id)
          .eq("is_template", true)
          .order("created_at", { ascending: false })

        setTemplates((data || []) as any[])
      } catch { setTemplates([]) }
      finally { setLoading(false) }
    }
    fetchTemplates()
  }, [open, currentCompany])

  // Built-in templates
  const builtinTemplates = [
    {
      id: "meeting-notes",
      title: "Meeting Notes",
      icon: "📋",
      blocks: [
        { type: "heading", text: "Meeting Notes" },
        { type: "paragraph", text: "Date: " + new Date().toLocaleDateString() },
        { type: "heading", text: "Attendees" },
        { type: "list", text: "" },
        { type: "heading", text: "Agenda" },
        { type: "list", text: "" },
        { type: "heading", text: "Action Items" },
        { type: "list", text: "[ ] " },
      ],
    },
    {
      id: "project-brief",
      title: "Project Brief",
      icon: "📑",
      blocks: [
        { type: "heading", text: "Project Brief" },
        { type: "heading", text: "Overview" },
        { type: "paragraph", text: "" },
        { type: "heading", text: "Goals" },
        { type: "list", text: "" },
        { type: "heading", text: "Timeline" },
        { type: "paragraph", text: "" },
        { type: "heading", text: "Resources" },
        { type: "list", text: "" },
      ],
    },
    {
      id: "team-wiki",
      title: "Team Wiki",
      icon: "📚",
      blocks: [
        { type: "heading", text: "Team Wiki" },
        { type: "heading", text: "About" },
        { type: "paragraph", text: "" },
        { type: "heading", text: "Members" },
        { type: "list", text: "" },
        { type: "heading", text: "Processes" },
        { type: "paragraph", text: "" },
        { type: "heading", text: "Resources" },
        { type: "list", text: "" },
      ],
    },
    {
      id: "checklist",
      title: "Checklist",
      icon: "✅",
      blocks: [
        { type: "heading", text: "Checklist" },
        { type: "list", text: "[ ] Item 1" },
        { type: "list", text: "[ ] Item 2" },
        { type: "list", text: "[ ] Item 3" },
      ],
    },
  ]

  const allTemplates = [...builtinTemplates, ...templates]

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
            className="fixed z-[181] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[80vh] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2">
                <LayoutGrid size={15} className="text-[var(--muted)]" />
                <h2 className="text-[14px] font-bold text-[var(--text)]">Templates Gallery</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allTemplates.map(template => (
                    <div
                      key={template.id}
                      className="group p-4 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--surface-2)] transition cursor-pointer"
                      onClick={() => setPreview(template)}
                    >
                      <div className="text-2xl mb-2">{template.icon || "📄"}</div>
                      <h3 className="text-[12px] font-bold text-[var(--text)] mb-1">{template.title}</h3>
                      <p className="text-[10px] text-[var(--muted)]">
                        {(template.blocks || []).length} blocks
                      </p>
                      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onUseTemplate?.(template.blocks || [], template.title)
                            onClose()
                          }}
                          className="flex-1 px-2 py-1 rounded-lg bg-[var(--accent)] text-white text-[9px] font-semibold hover:bg-[var(--accent-deep)] transition cursor-pointer"
                        >
                          Use Template
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreview(template) }}
                          className="px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[9px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                        >
                          <Eye size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview panel */}
            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[var(--surface)] z-10 flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preview.icon}</span>
                      <h2 className="text-[14px] font-bold text-[var(--text)]">{preview.title}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onUseTemplate?.(preview.blocks || [], preview.title)
                          onClose()
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[11px] font-semibold hover:bg-[var(--accent-deep)] transition cursor-pointer"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => setPreview(null)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] text-[11px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {(preview.blocks || []).map((block: any, i: number) => (
                      <div key={i} className="text-[12px] text-[var(--text)]">
                        {block.type === "heading" && <h3 className="font-bold text-[14px]">{block.text}</h3>}
                        {block.type === "paragraph" && <p className="text-[var(--muted)]">{block.text || "..."}</p>}
                        {block.type === "list" && <p className="ml-3">• {block.text}</p>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
