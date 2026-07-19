import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, LogOut, Info, CheckCircle, X, Loader2 } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  variant?: "delete" | "warning" | "info" | "success" | "confirm";
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  requireTyping?: string;
  holdToConfirm?: boolean;
  input?: { label: string; placeholder: string; defaultValue?: string };
}

type DialogResolve = (value: boolean | string | null) => void;

interface DialogState {
  open: boolean;
  resolve: DialogResolve;
  options: ConfirmOptions;
}

const DialogContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: ConfirmOptions) => Promise<string | null>;
} | null>(null);

export function useConfirmDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useConfirmDialog must be used within DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const resolveRef = useRef<DialogResolve | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const wrapped: DialogResolve = (v) => resolve(v as boolean);
      resolveRef.current = wrapped;
      setState({ open: true, resolve: wrapped, options });
    });
  }, []);

  const prompt = useCallback((options: ConfirmOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      const wrapped: DialogResolve = (v) => resolve(v as string | null);
      resolveRef.current = wrapped;
      setState({ open: true, resolve: wrapped, options: { ...options, variant: options.variant ?? "info", input: options.input ?? { label: "Input", placeholder: "Type here..." } } });
    });
  }, []);

  const handleClose = useCallback((value: boolean | string | null) => {
    if (resolveRef.current) resolveRef.current(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <AnimatePresence>
        {state && (
          <ConfirmationDialogInner
            key="dialog"
            options={state.options}
            onClose={handleClose}
            onConfirm={(v) => handleClose(v ?? true)}
          />
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

const iconMap = {
  delete: Trash2,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  confirm: Info,
};

const iconGradientMap: Record<string, string> = {
  delete: "linear-gradient(135deg, #ef4444, #f43f5e)",
  warning: "linear-gradient(135deg, #f59e0b, #eab308)",
  info: "linear-gradient(135deg, #3b82f6, #6366f1)",
  success: "linear-gradient(135deg, #22c55e, #10b981)",
  confirm: "linear-gradient(135deg, #3b82f6, #6366f1)",
};

function ConfirmationDialogInner({
  options,
  onClose,
  onConfirm,
}: {
  options: ConfirmOptions;
  onClose: (value: boolean | string | null) => void;
  onConfirm: (value?: string | boolean) => void;
}) {
  const { title, description, variant = "confirm", confirmText, cancelText, destructive = variant === "delete", requireTyping, input, holdToConfirm } = options;
  const Icon = iconMap[variant] ?? Info;
  const [typedText, setTypedText] = useState("");
  const [inputValue, setInputValue] = useState(input?.defaultValue ?? "");
  const [loading, setLoading] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef(0);
  const rafRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const needsTyping = requireTyping && typedText !== requireTyping;
  const canConfirm = input ? inputValue.trim().length > 0 : holdToConfirm ? holdProgress >= 100 : !needsTyping;

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(null); return; }
      if (e.key === "Enter" && canConfirm && !input) { onConfirm(inputValue || true); return; }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, input, textarea, [tabindex]:not([tabindex='-1'])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canConfirm, input, inputValue, onClose, onConfirm]);

  const startHold = () => {
    if (!holdToConfirm) return;
    holdStartRef.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) { onConfirm(true); return; }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const stopHold = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    onConfirm(input ? inputValue : true);
  };

  const confirmLabel = confirmText || (destructive ? "Delete" : "Confirm");
  const cancelLabel = cancelText || "Cancel";

  const iconGrad = iconGradientMap[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={() => onClose(null)}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
        className="relative mx-auto w-[420px] overflow-hidden bg-white shadow-xl"
        style={{
          borderRadius: 24,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pb-5 pt-0">
          <button
            onClick={() => onClose(null)}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.05 }}
              className="mx-auto -mt-5 mb-5 flex h-[60px] w-[164px] items-center justify-center rounded-[30px]"
              style={{ background: destructive ? "#111" : "#111" }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.15 }}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="text-[22px] font-bold tracking-tight text-gray-900"
            >
              {title}
            </motion.h2>

            {description && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-2 text-[14px] leading-relaxed text-gray-500"
                style={{ whiteSpace: "pre-line" }}
              >
                {description}
              </motion.p>
            )}

            {requireTyping && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-5 w-full"
              >
                <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-widest text-gray-400">
                  Type <span className="font-mono text-gray-600">{requireTyping}</span> to confirm
                </p>
                <input
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-center text-sm font-mono tracking-[0.25em] outline-none transition-all placeholder:text-gray-300 focus:border-gray-300 focus:bg-white focus:shadow-sm"
                  placeholder={requireTyping}
                  autoFocus
                />
              </motion.div>
            )}

            {input && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-5 w-full text-left"
              >
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">{input.label}</p>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-gray-300 focus:bg-white focus:shadow-sm"
                  placeholder={input.placeholder}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && inputValue.trim()) handleConfirm(); }}
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-6 flex w-full flex-col gap-2"
            >
              {(destructive || variant === "delete") && !holdToConfirm && (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || loading}
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #f43f5e)",
                    boxShadow: "0 2px 8px rgba(239,68,68,0.25)",
                  }}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {confirmLabel}
                </button>
              )}

              {holdToConfirm && (
                <button
                  onMouseDown={startHold}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                  onTouchStart={startHold}
                  onTouchEnd={stopHold}
                  disabled={loading}
                  className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white select-none"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #f43f5e)",
                    boxShadow: "0 2px 8px rgba(239,68,68,0.25)",
                  }}
                >
                  <motion.div className="absolute left-0 top-0 h-full bg-white/15" style={{ width: `${holdProgress}%` }} />
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : holdProgress > 0 ? `${Math.round(holdProgress)}%` : `Hold to ${confirmLabel.toLowerCase()}`}
                  </span>
                </button>
              )}

              {!destructive && variant !== "delete" && !holdToConfirm && (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || loading}
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    boxShadow: "0 2px 8px rgba(59,130,246,0.25)",
                  }}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {confirmLabel}
                </button>
              )}

              {cancelLabel !== "Cancel" || !variant?.includes("delete") ? (
                <button
                  ref={cancelRef}
                  onClick={() => onClose(null)}
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cancelLabel}
                </button>
              ) : null}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
