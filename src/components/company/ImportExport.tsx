import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, Upload, FileText, Loader2, X, Check } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface ImportExportProps {
  pageId: string
  pageTitle: string
  blocks?: any[]
  open: boolean
  onClose: () => void
}

export function ImportExport({ pageId, pageTitle, blocks, open, onClose }: ImportExportProps) {
  const [tab, setTab] = useState<"export" | "import">("export")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportMarkdown = () => {
    if (!blocks) return
    let md = `# ${pageTitle}\n\n`
    blocks.forEach((block: any) => {
      if (block.type === "heading") md += `## ${block.text || ""}\n\n`
      else if (block.type === "paragraph") md += `${block.text || ""}\n\n`
      else if (block.type === "list") md += `- ${block.text || ""}\n`
      else if (block.type === "code") md += "```\n" + (block.text || "") + "\n```\n\n"
      else if (block.type === "quote") md += `> ${block.text || ""}\n\n`
      else md += `${block.text || ""}\n\n`
    })
    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${pageTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
    setSuccess("Exported!")
    setTimeout(() => { setSuccess(""); onClose() }, 1500)
  }

  const exportJSON = () => {
    const data = { title: pageTitle, blocks, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${pageTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSuccess("Exported!")
    setTimeout(() => { setSuccess(""); onClose() }, 1500)
  }

  const handleImport = async (file: File) => {
    setLoading(true)
    try {
      const text = await file.text()
      let newBlocks: any[] = []

      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text)
        newBlocks = parsed.blocks || []
      } else if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const lines = text.split("\n")
        newBlocks = lines.filter(l => l.trim()).map(line => {
          if (line.startsWith("# ")) return { type: "heading", text: line.slice(2) }
          if (line.startsWith("## ")) return { type: "heading", text: line.slice(3) }
          if (line.startsWith("> ")) return { type: "quote", text: line.slice(2) }
          if (line.startsWith("- ")) return { type: "list", text: line.slice(2) }
          if (line.startsWith("```")) return null
          return { type: "paragraph", text: line }
        }).filter(Boolean)
      }

      // Append to existing blocks
      const { data: current } = await supabase
        .from("pages" as any)
        .select("blocks")
        .eq("id", pageId)
        .single()

      const existingBlocks = (current as any)?.blocks || []
      await supabase
        .from("pages" as any)
        .update({ blocks: [...existingBlocks, ...newBlocks] } as any)
        .eq("id", pageId)

      setSuccess(`Imported ${newBlocks.length} blocks`)
      setTimeout(() => { setSuccess(""); onClose() }, 1500)
    } catch (e: any) {
      setSuccess(`Error: ${e.message}`)
    }
    finally { setLoading(false) }
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
            className="fixed z-[181] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]/70">
              <h2 className="text-[14px] font-bold text-[var(--text)]">Import / Export</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-xl hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-1 px-5 pt-3">
              {(["export", "import"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-3">
              {tab === "export" && (
                <>
                  <button
                    onClick={exportMarkdown}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition cursor-pointer"
                  >
                    <FileText size={16} className="text-[var(--muted)]" />
                    <div className="text-left">
                      <p className="text-[12px] font-semibold text-[var(--text)]">Markdown (.md)</p>
                      <p className="text-[10px] text-[var(--muted)]">Export as Markdown file</p>
                    </div>
                  </button>
                  <button
                    onClick={exportJSON}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition cursor-pointer"
                  >
                    <FileText size={16} className="text-[var(--muted)]" />
                    <div className="text-left">
                      <p className="text-[12px] font-semibold text-[var(--text)]">JSON</p>
                      <p className="text-[10px] text-[var(--muted)]">Export with all block data</p>
                    </div>
                  </button>
                </>
              )}

              {tab === "import" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.json"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
                    ) : (
                      <Upload size={16} className="text-[var(--muted)]" />
                    )}
                    <div className="text-left">
                      <p className="text-[12px] font-semibold text-[var(--text)]">Choose file</p>
                      <p className="text-[10px] text-[var(--muted)]">Supports .md, .txt, .json</p>
                    </div>
                  </button>
                </>
              )}

              {success && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${
                  success.startsWith("Error") ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                }`}>
                  {success.startsWith("Error") ? <X size={12} /> : <Check size={12} />}
                  {success}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
