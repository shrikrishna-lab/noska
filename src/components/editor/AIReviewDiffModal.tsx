/**
 * Noska Real-Time Collaboration — AI Review Diff Modal
 * Previews proposed AI changes against live synchronized blocks with Accept, Reject, and Apply controls.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, Check, X, ArrowRight, Layers } from "lucide-react";
import type { AIReviewDiff } from "../../collaboration/types";

interface AIReviewDiffModalProps {
  diff: AIReviewDiff | null;
  onAccept: () => void;
  onReject: () => void;
}

export const AIReviewDiffModal: React.FC<AIReviewDiffModalProps> = ({
  diff,
  onAccept,
  onReject,
}) => {
  if (!diff) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={onReject}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden z-10 text-[var(--text)] flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Review AI Modifications</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Compare proposed changes before updating the collaborative document
                </p>
              </div>
            </div>

            <button
              onClick={onReject}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Conflict Warning if detected */}
          {diff.conflictDetected && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Concurrent Edit Conflict Warning:</span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {diff.conflictDetails || "A teammate edited some of these blocks while AI was processing. Review the diff carefully to avoid overwriting their work."}
                </p>
              </div>
            </div>
          )}

          {/* Diff Summary Badges */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] text-xs">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Changes:</span>
            {diff.addedBlockIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                +{diff.addedBlockIds.length} added
              </span>
            )}
            {diff.modifiedBlockIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[11px]">
                ~{diff.modifiedBlockIds.length} modified
              </span>
            )}
            {diff.deletedBlockIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-medium text-[11px]">
                -{diff.deletedBlockIds.length} removed
              </span>
            )}
          </div>

          {/* Body Preview */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Proposed Result
            </h4>
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2 text-xs leading-relaxed max-h-64 overflow-y-auto">
              {diff.proposedBlocks.map((b) => (
                <div
                  key={b.id}
                  className={`p-1.5 rounded transition ${
                    diff.addedBlockIds.includes(b.id)
                      ? "bg-emerald-500/10 border-l-2 border-emerald-500 pl-2"
                      : diff.modifiedBlockIds.includes(b.id)
                      ? "bg-blue-500/10 border-l-2 border-blue-500 pl-2"
                      : ""
                  }`}
                >
                  {b.text || b.properties?.richText?.map((s: any) => s.text).join("") || "Empty block"}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)]/50">
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--elevated)] hover:bg-[var(--hover)] text-xs font-medium transition cursor-pointer"
            >
              Discard Changes
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onAccept}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-md"
              >
                <Check size={14} />
                <span>Apply to Document</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AIReviewDiffModal;
