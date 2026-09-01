import React, { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Building2, ArrowRight, Loader2, Check } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import { slugifyCompany, isSlugAvailable } from "../../lib/company"

interface CreateCompanyModalProps {
  onClose: () => void
}

export function CreateCompanyModal({ onClose }: CreateCompanyModalProps) {
  const { createCompany } = useCompany()
  const [step, setStep] = useState<"details" | "creating" | "done">("details")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [slugAvailable, setSlugAvailable] = useState(true)
  const [error, setError] = useState("")

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    const newSlug = slugifyCompany(value)
    setSlug(newSlug)
    if (newSlug) {
      isSlugAvailable(newSlug).then(setSlugAvailable)
    }
  }, [])

  const handleCreate = async () => {
    if (!name.trim() || !slug || !slugAvailable) return

    setStep("creating")
    setError("")

    try {
      await createCompany(name.trim(), slug, description)
      setStep("done")
      setTimeout(onClose, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create company")
      setStep("details")
    }
  }

  const canCreate = name.trim().length >= 2 && slug && slugAvailable && step === "details"

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
        className="w-full max-w-[440px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--noska-blue)]/10 flex items-center justify-center">
              <Building2 size={16} className="text-[var(--noska-blue)]" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text)]">Create Company</h2>
              <p className="text-[11px] text-[var(--muted)]">Set up your organization workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {step === "done" ? (
          <div className="px-5 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3"
            >
              <Check size={24} className="text-green-500" />
            </motion.div>
            <p className="text-[14px] font-medium text-[var(--text)]">Company Created!</p>
            <p className="text-[12px] text-[var(--muted)] mt-1">Redirecting to your workspace...</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">Company Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corp"
                maxLength={64}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition-colors"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">URL Slug</label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px]">
                <span className="text-[var(--muted)]">noska.me/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    isSlugAvailable(e.target.value).then(setSlugAvailable)
                  }}
                  className="flex-1 bg-transparent text-[var(--text)] outline-none min-w-0"
                  placeholder="acme-corp"
                />
              </div>
              {slug && !slugAvailable && (
                <p className="text-[10px] text-red-500">This slug is already taken</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your company do?"
                maxLength={200}
                rows={2}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--noska-blue)] transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-500 bg-red-500/5 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>
        )}

        {/* Footer */}
        {step !== "done" && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]/50">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--noska-blue)] text-white rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {step === "creating" ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Company
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
