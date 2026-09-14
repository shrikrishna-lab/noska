import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ExternalLink, Rocket, CheckCircle2 } from "lucide-react";
import { useReleaseNotes, type ReleaseNotes } from "@/hooks/useReleaseNotes";
import { MarkdownBody } from "@/components/ui/MarkdownLite";
import { Button } from "@/components/ui/button";

// "What's New" modal — appears once after the Noska desktop app updates to a
// new version, rendering the rich release notes published for that update.
// Dismissal persists per version: never shown again until the next update.
export function ReleaseNotesModal({
  notes: controlledNotes,
  dismiss: controlledDismiss,
}: {
  notes?: ReleaseNotes | null;
  dismiss?: () => void;
} = {}) {
  const internal = useReleaseNotes();
  const notes = controlledNotes !== undefined ? controlledNotes : internal.notes;
  const dismiss = controlledDismiss ?? internal.dismiss;

  // Listen for Escape key to dismiss
  useEffect(() => {
    if (!notes) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notes, dismiss]);

  return (
    <AnimatePresence>
      {notes && (
        <motion.div
          key="release-notes-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={dismiss}
        >
          <motion.div
            key="release-notes-modal"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
            className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-neutral-800/90 dark:bg-[#16181F]/95 dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top specular highlight line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200/70 px-6 py-4.5 dark:border-neutral-800/70">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary shadow-inner">
                  <Rocket className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                      {notes.title || `What's new in ${notes.version}`}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {notes.version}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {notes.publishedAt
                      ? `Released on ${new Date(notes.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                      : "Official Desktop Update · Installed and ready"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss release notes"
                onClick={dismiss}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Markdown Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-neutral-800 dark:text-neutral-200">
              <MarkdownBody
                body={notes.body}
                opts={{ skipTitle: true }}
                className="space-y-3 leading-relaxed"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800/70 dark:bg-neutral-900/40">
              {notes.url ? (
                <a
                  href={notes.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  <span>Full release on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={dismiss}
                  className="relative inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Got it</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
