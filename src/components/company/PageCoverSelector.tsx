import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Image, X, Loader2, Upload, Link as LinkIcon } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f5576c 0%, #ff6a88 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
  "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
]

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=300&fit=crop",
]

interface PageCoverSelectorProps {
  pageId: string
  currentCover?: string | null
  onCoverChange?: (url: string | null) => void
}

export function PageCoverSelector({ pageId, currentCover, onCoverChange }: PageCoverSelectorProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customUrl, setCustomUrl] = useState("")
  const [activeTab, setActiveTab] = useState<"gradients" | "images" | "url">("gradients")

  const handleSelect = async (cover: string) => {
    setLoading(true)
    try {
      await supabase
        .from("pages" as any)
        .update({ cover_url: cover } as any)
        .eq("id", pageId)
      onCoverChange?.(cover)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      await supabase
        .from("pages" as any)
        .update({ cover_url: null } as any)
        .eq("id", pageId)
      onCoverChange?.(null)
      setOpen(false)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      {/* Cover preview / button */}
      {currentCover ? (
        <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
          <div
            className="w-full h-32 rounded-xl overflow-hidden"
            style={{ background: currentCover.startsWith("http") ? `url(${currentCover}) center/cover` : currentCover }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-xl flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-semibold bg-black/50 px-3 py-1.5 rounded-lg transition">
              Change cover
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleRemove() }}
            className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]/50 flex items-center justify-center gap-2 text-[var(--muted)] hover:text-[var(--accent)] transition text-[11px] font-medium cursor-pointer"
        >
          <Image size={14} />
          Add cover
        </button>
      )}

      {/* Picker modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[170] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="fixed z-[171] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/70">
                <h3 className="text-[13px] font-bold text-[var(--text)]">Cover</h3>
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                  <X size={13} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-4 pt-2">
                {(["gradients", "images", "url"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      activeTab === tab ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {tab === "url" ? "Custom URL" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[300px] overflow-y-auto">
                {activeTab === "gradients" && (
                  <div className="grid grid-cols-4 gap-2">
                    {COVER_GRADIENTS.map((g, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(g)}
                        disabled={loading}
                        className="h-16 rounded-xl cursor-pointer hover:scale-105 transition-transform border-2 border-transparent hover:border-white/30 disabled:opacity-50"
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                )}

                {activeTab === "images" && (
                  <div className="grid grid-cols-2 gap-2">
                    {COVER_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(url)}
                        disabled={loading}
                        className="h-20 rounded-xl cursor-pointer hover:scale-105 transition-transform border-2 border-transparent hover:border-white/30 disabled:opacity-50 overflow-hidden"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "url" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={customUrl}
                        onChange={e => setCustomUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                      />
                      <button
                        onClick={() => customUrl && handleSelect(customUrl)}
                        disabled={!customUrl || loading}
                        className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : "Use"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
