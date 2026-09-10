import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Building2, ArrowRight, Loader2, Check, Sparkles, Globe, AlignLeft } from "lucide-react"
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
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [error, setError] = useState("")

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    const newSlug = slugifyCompany(value)
    setSlug(newSlug)
    if (newSlug) {
      setCheckingSlug(true)
      isSlugAvailable(newSlug)
        .then(setSlugAvailable)
        .finally(() => setCheckingSlug(false))
    }
  }, [])

  const handleSlugChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    setSlug(cleaned)
    if (cleaned) {
      setCheckingSlug(true)
      isSlugAvailable(cleaned)
        .then(setSlugAvailable)
        .finally(() => setCheckingSlug(false))
    }
  }, [])

  const handleCreate = async () => {
    if (!name.trim() || !slug || !slugAvailable) return

    setStep("creating")
    setError("")

    try {
      await createCompany(name.trim(), slug, description)
      setStep("done")
      setTimeout(onClose, 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create organization")
      setStep("details")
    }
  }

  const canCreate = name.trim().length >= 2 && slug.trim().length >= 2 && slugAvailable && step === "details"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 dark:bg-black/65 backdrop-blur-md p-4 select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="w-full max-w-[460px] bg-white/95 dark:bg-[#161a23]/95 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                Create Organization
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Set up your company workspace & teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        {step === "done" ? (
          <div className="px-6 py-12 text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-xs"
            >
              <Check size={28} strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Organization Created</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Opening your new workspace...</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Acme Corporation, Linear Lab"
                maxLength={64}
                className="w-full px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition-all shadow-2xs"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Workspace URL Slug
              </label>
              <div className="flex items-center px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 rounded-xl text-xs transition-all shadow-2xs">
                <span className="text-neutral-400 select-none mr-0.5">noska.me/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="acme-corp"
                  className="flex-1 bg-transparent text-neutral-900 dark:text-white outline-none min-w-0"
                />
                {slug && (
                  checkingSlug ? (
                    <Loader2 size={13} className="animate-spin text-neutral-400 shrink-0" />
                  ) : slugAvailable ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      <Check size={11} strokeWidth={2.5} /> Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">
                      Taken
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Description <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your company or team work on?"
                maxLength={200}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none transition-all resize-none shadow-2xs"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-xl">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        {step !== "done" && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
            >
              {step === "creating" ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creating Organization...</span>
                </>
              ) : (
                <>
                  <span>Create Organization</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
