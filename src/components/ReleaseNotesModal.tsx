import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ExternalLink, Rocket } from "lucide-react";
import { useReleaseNotes } from "@/hooks/useReleaseNotes";
import { MarkdownBody } from "@/components/ui/MarkdownLite";
import { Button } from "@/components/ui/button";

// "What's New" modal — appears once after the desktop app updates to a new
// version, rendering the release notes published to the public releases repo.
// Dismissal persists per version: never shown again until the next update.
export function ReleaseNotesModal() {
  const { notes, dismiss } = useReleaseNotes();

  return (
    <AnimatePresence>
      {notes && (
        <motion.div
          key="release-notes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Rocket className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">{notes.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Release notes · {notes.version}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss release notes"
                onClick={dismiss}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-foreground">
              <MarkdownBody body={notes.body} />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
              <a
                href={notes.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Full release on GitHub <ExternalLink className="h-3 w-3" />
              </a>
              <Button size="sm" onClick={dismiss}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
