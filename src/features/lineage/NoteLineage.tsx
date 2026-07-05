import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Dna,
  X,
  GitBranch,
  Copy,
  Sparkles,
  FileText,
  FilePlus,
  Edit3,
  Trash2,
  RotateCcw,
  Clock
} from "lucide-react";

/* ─── Icon mapping for lineage events ─── */

const EVENT_META = {
  created:     { icon: FilePlus,   color: "text-[var(--success)]", bg: "bg-[var(--success)]/10", label: "Created" },
  duplicated:  { icon: Copy,       color: "text-[var(--noska-blue)]", bg: "bg-[var(--noska-blue-soft)]", label: "Duplicated from" },
  ai_generated:{ icon: Sparkles,   color: "text-[var(--accent-deep)]", bg: "bg-[var(--accent-deep)]/10", label: "AI Generated" },
  forked:      { icon: GitBranch,  color: "text-[var(--noska-blue-light)]", bg: "bg-[var(--noska-blue-light)]/10", label: "Forked from" },
  template:    { icon: FileText,   color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10", label: "From template" },
  edited:      { icon: Edit3,      color: "text-[var(--secondary)]", bg: "bg-[var(--surface)]", label: "Edited" },
  trashed:     { icon: Trash2,     color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10", label: "Trashed" },
  restored:    { icon: RotateCcw,  color: "text-[var(--success)]", bg: "bg-[var(--success)]/10", label: "Restored" }
};

function timeAgoFull(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

/* ─── main component ─── */

export default function NoteLineage({ page, pages, onClose }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Build lineage from page metadata
  const lineage = useMemo(() => {
    const events = page?.lineage || [];

    // If no lineage tracked yet, infer from page data
    if (events.length === 0) {
      const inferred = [];
      inferred.push({
        action: "created",
        timestamp: page?.updatedAt || new Date().toISOString(),
        detail: `Page "${page?.title}" created`
      });
      return inferred;
    }

    return [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [page]);

  // Find parent chain
  const parentChain = useMemo(() => {
    const chain = [];
    let current = page;
    const visited = new Set();
    while (current?.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId);
      const parent = pages?.find((p) => p.id === current.parentId);
      if (parent) {
        chain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    return chain;
  }, [page, pages]);

  // Child pages
  const children = useMemo(() => {
    return pages?.filter((p) => p.parentId === page?.id && !p.trashed) || [];
  }, [page, pages]);

  if (!page) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[520px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Dna size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Note DNA</h2>
          <span className="text-xs text-[var(--muted)]">{page.icon} {page.title}</span>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* Page tree */}
        {(parentChain.length > 0 || children.length > 0) && (
          <div className="border-b border-[var(--border)] px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Page Tree</div>
            <div className="flex items-center gap-1 flex-wrap text-xs">
              {parentChain.map((p, i) => (
                <React.Fragment key={p.id}>
                  <span className="text-[var(--muted)]">{p.icon} {p.title}</span>
                  <span className="text-[var(--muted)]">→</span>
                </React.Fragment>
              ))}
              <span className="font-semibold text-[var(--text)]">{page.icon} {page.title}</span>
              {children.length > 0 && (
                <>
                  <span className="text-[var(--muted)]">→</span>
                  <span className="text-[var(--muted)]">{children.length} sub-page{children.length > 1 ? "s" : ""}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">History</div>
          <div className="relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-[var(--border)]" />

            {lineage.map((event, i) => {
              const meta = EVENT_META[event.action] || EVENT_META.edited;
              const Icon = meta.icon;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING_PRESETS.soft, delay: i * 0.05 }}
                  className="relative flex gap-3 pb-5"
                >
                  {/* Node */}
                  <div className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${meta.bg}`}>
                    <Icon size={12} className={meta.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      <span className="text-[10px] text-[var(--muted)]">{timeAgoFull(event.timestamp)}</span>
                    </div>
                    {event.detail && (
                      <p className="mt-0.5 text-xs text-[var(--secondary)] leading-5">{event.detail}</p>
                    )}
                    {event.sourceName && (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Source: {event.sourceName}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
          <Clock size={12} className="text-[var(--muted)]" />
          <span className="text-xs text-[var(--muted)]">
            Created {formatDate(lineage[0]?.timestamp)} · Last edited {formatDate(page.updatedAt)}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
