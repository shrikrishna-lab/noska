import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, ExternalLink } from "lucide-react";
import { useReleaseNotes, type ReleaseNotes } from "@/hooks/useReleaseNotes";
import { renderInlineMd } from "@/components/ui/MarkdownLite";

// Floating corner popover for Release Notes — dynamically renders REAL changelog data
// version-by-version, adapting to both Light and Dark themes.
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

  // Parse real release notes body into dynamic structured sections & bullets
  const parsedSections = useMemo(() => {
    if (!notes?.body) return [];

    const lines = notes.body.split("\n");
    const sections: Array<{ title?: string; items: string[]; quotes: string[] }> = [];
    let currentSection: { title?: string; items: string[]; quotes: string[] } = {
      items: [],
      quotes: [],
    };

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) return;

      // Match markdown section headers (## Heading, ### Heading)
      const headingMatch = line.match(/^#{2,4}\s+(.*)$/);
      if (headingMatch) {
        if (currentSection.items.length > 0 || currentSection.quotes.length > 0 || currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headingMatch[1].replace(/^[🚀✨🎉🔧🐛📦⚡\s]+/, "").trim(),
          items: [],
          quotes: [],
        };
        return;
      }

      // Skip top-level # Title (already shown in header chrome)
      if (/^#\s+/.test(line)) return;

      // Bullet items (- item or * item)
      if (/^[-*•]\s+/.test(line)) {
        const itemText = line.replace(/^[-*•]\s+/, "").trim();
        if (itemText) currentSection.items.push(itemText);
        return;
      }

      // Blockquotes (> text)
      if (/^>\s?/.test(line)) {
        const quoteText = line.replace(/^>\s?/, "").trim();
        if (quoteText) currentSection.quotes.push(quoteText);
        return;
      }

      // Regular text lines treated as bullet items if meaningful
      if (line.length > 0 && !/^---+$/.test(line)) {
        currentSection.items.push(line);
      }
    });

    if (currentSection.items.length > 0 || currentSection.quotes.length > 0 || currentSection.title) {
      sections.push(currentSection);
    }

    return sections;
  }, [notes?.body]);

  if (!notes) return null;

  const formattedDate = notes.publishedAt
    ? new Date(notes.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const versionTag = notes.version.startsWith("v") ? notes.version : `v${notes.version}`;

  return (
    <AnimatePresence>
      <motion.div
        key="floating-release-notes"
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.75 }}
        className="fixed bottom-6 right-6 z-[999999] w-[380px] max-w-[calc(100vw-32px)] select-none font-sans"
      >
        {/* Popover card adapting to both Light and Dark themes */}
        <div className="relative flex flex-col max-h-[500px] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 text-neutral-900 shadow-[0_16px_45px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#14161F]/95 dark:text-[#E6E8EE] dark:shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_25px_rgba(255,140,115,0.15)]">
          {/* Top ambient specular highlight line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-900/10 to-transparent dark:via-white/20" />

          {/* Header */}
          <div className="px-5 pt-4.5 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[14px] font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <span>{versionTag} Release Notes</span>
                </h2>
                <p className="text-[12px] text-neutral-500 dark:text-[#8E92A4] mt-0.5 font-normal">
                  {formattedDate}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close release notes"
                onClick={dismiss}
                className="rounded-lg p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors dark:text-[#8E92A4] dark:hover:text-white dark:hover:bg-white/10 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full bg-neutral-100 dark:bg-white/[0.08]" />

          {/* Content Body with customized scrollbar */}
          <div className="relative flex-1 overflow-y-auto px-5 py-3.5 text-[12.5px] leading-relaxed text-neutral-700 dark:text-[#D0D4E0] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-white/20 scrollbar-track-transparent space-y-4">
            {parsedSections.length > 0 ? (
              parsedSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-2">
                  {sec.title && (
                    <div className="text-[13px] font-bold text-neutral-900 dark:text-white tracking-tight">
                      {sec.title}
                    </div>
                  )}

                  {sec.items.length > 0 && (
                    <ul className="space-y-2">
                      {sec.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-[#8E92A4]" />
                          <div className="min-w-0 flex-1 text-neutral-700 dark:text-[#D0D4E0] [&_strong]:text-neutral-900 dark:[&_strong]:text-white [&_strong]:font-semibold [&_code]:bg-neutral-100 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px]">
                            {renderInlineMd(item, `rn-${secIdx}-${itemIdx}`)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {sec.quotes.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-2.5 rounded-lg bg-neutral-100/70 dark:bg-white/5 border-l-2 border-[#FF6B4A] text-[11.5px] italic text-neutral-600 dark:text-neutral-400"
                    >
                      {renderInlineMd(q, `rn-q-${secIdx}-${qIdx}`)}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 py-2">
                Version {versionTag} installed successfully.
              </p>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/80 dark:border-white/[0.08] dark:bg-black/20 flex items-center justify-between">
            {notes.url ? (
              <a
                href={notes.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-[#8E92A4] dark:hover:text-white transition-colors"
              >
                <span>Full changelog</span>
                <ExternalLink size={11} />
              </a>
            ) : (
              <span className="text-[11px] text-neutral-400 dark:text-[#8E92A4]/60">
                Noska Desktop
              </span>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border dark:border-white/15 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            >
              <Check size={12} />
              <span>Got it</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ReleaseNotesModal;
