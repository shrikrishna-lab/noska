import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crosshair, ExternalLink, Calendar, Clock, Tag, Star } from "lucide-react";

export default function GraphInfoPanel({ page, nodePosition, onClose, onCenter }) {
  if (!page) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="absolute bottom-4 right-4 z-30 w-64 rounded-xl border border-[var(--border)] bg-[var(--elevated)]/95 backdrop-blur-md shadow-[var(--shadow-floating)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Node Info</span>
          <div className="flex gap-1">
            <button
              onClick={onCenter}
              className="p-1 rounded text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Center on this node"
            >
              <Crosshair size={12} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{page.icon || "📄"}</span>
            <span className="text-sm font-semibold text-[var(--text)] truncate">
              {page.title || "Untitled"}
            </span>
            {page.favorite && <Star size={12} className="fill-[var(--warning)] text-[var(--warning)] shrink-0" />}
          </div>
          {page.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Tag size={11} className="text-[var(--secondary)] mt-0.5" />
              {page.tags.map((t) => (
                <span key={t} className="rounded bg-[var(--hover)] px-1.5 py-0.5 text-[10px] text-[var(--secondary)]">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-[var(--muted)]">
            {page.createdAt && (
              <span className="flex items-center gap-1"><Calendar size={10} />{new Date(page.createdAt).toLocaleDateString()}</span>
            )}
            {page.updatedAt && (
              <span className="flex items-center gap-1"><Clock size={10} />{new Date(page.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
          {page.parentId && (
            <div className="text-[10px] text-[var(--muted)]">
              Parent: <span className="text-[var(--secondary)]">{page.parentId.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
