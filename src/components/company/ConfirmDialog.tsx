import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Trash2, Info, AlertCircle, Loader2, X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: "danger" | "warning" | "info"
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmText = "Confirm", cancelText = "Cancel",
  type = "danger", loading = false
}: ConfirmDialogProps) {
  const [processing, setProcessing] = useState(false)

  const handleConfirm = async () => {
    setProcessing(true)
    try { await onConfirm() } catch {}
    finally { setProcessing(false) }
  }

  const iconMap = {
    danger: <Trash2 size={18} className="text-red-500" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
    info: <Info size={18} className="text-blue-500" />,
  }

  const btnColor = {
    danger: "bg-red-500 hover:bg-red-600",
    warning: "bg-amber-500 hover:bg-amber-600",
    info: "bg-blue-500 hover:bg-blue-600",
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="fixed z-[301] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                {iconMap[type]}
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-[var(--text)]">{title}</h3>
                <p className="text-[12px] text-[var(--muted)] mt-1 leading-relaxed">{message}</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--muted)] hover:bg-[var(--hover)] transition cursor-pointer">
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing || loading}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition disabled:opacity-50 cursor-pointer ${btnColor[type]}`}
              >
                {(processing || loading) ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
