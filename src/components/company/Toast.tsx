import React, { useState, useEffect, useCallback, createContext, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react"

interface ToastItem {
  id: string
  type: "success" | "error" | "warning" | "info" | "loading"
  message: string
  duration?: number
}

interface ToastContextType {
  toast: (type: ToastItem["type"], message: string, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  loading: (message: string) => () => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastItem["type"], message: string, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, duration }])
    if (type !== "loading" && duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
    return () => setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const api = {
    toast: addToast,
    success: (msg: string) => addToast("success", msg),
    error: (msg: string) => addToast("error", msg, 5000),
    warning: (msg: string) => addToast("warning", msg, 4000),
    info: (msg: string) => addToast("info", msg),
    loading: (msg: string) => addToast("loading", msg, 0),
  }

  const icons = {
    success: <Check size={14} className="text-green-500" />,
    error: <X size={14} className="text-red-500" />,
    warning: <AlertTriangle size={14} className="text-amber-500" />,
    info: <Info size={14} className="text-blue-500" />,
    loading: <Loader2 size={14} className="animate-spin text-[var(--muted)]" />,
  }

  const colors = {
    success: "border-green-500/30 bg-green-500/5",
    error: "border-red-500/30 bg-red-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
    loading: "border-[var(--border)] bg-[var(--surface)]",
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-xl ${colors[t.type]}`}
            >
              {icons[t.type]}
              <span className="text-[12px] font-medium text-[var(--text)]">{t.message}</span>
              {t.type !== "loading" && (
                <button onClick={() => dismiss(t.id)} className="ml-2 p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] cursor-pointer">
                  <X size={10} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
