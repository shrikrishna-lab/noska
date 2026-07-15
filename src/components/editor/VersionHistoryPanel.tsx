import React, { useState } from "react";
import { History, X, ChevronLeft } from "lucide-react";
import type { Block, DatabaseSchema } from "../../../types/blocks";

/** Shape of a single saved snapshot, as written by Editor.tsx's
 * auto-save effect (`audit_${page.id}` in localStorage) and read back by
 * `loadVersionHistory()`. Not exported from anywhere else in the
 * codebase — defined here since this is the only file that consumes it. */
interface VersionEntry {
  id?: string;
  timestamp: string;
  title?: string;
  blocks: Block[];
  database?: DatabaseSchema;
  label?: string;
}

interface BlockDiffChange {
  id: string;
  oldText?: string;
  newText?: string;
  oldType?: string;
  newType?: string;
}

interface BlockDiff {
  added: Block[];
  removed: Block[];
  changed: BlockDiffChange[];
  unchanged: Block[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

function computeBlockDiff(oldBlocks: Block[] | undefined, newBlocks: Block[] | undefined): BlockDiff {
  const oldMap = new Map((oldBlocks || []).map(b => [b.id, b]));
  const newMap = new Map((newBlocks || []).map(b => [b.id, b]));
  const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
  const added: Block[] = [], removed: Block[] = [], changed: BlockDiffChange[] = [], unchanged: Block[] = [];
  for (const id of allIds) {
    const old = oldMap.get(id);
    const cur = newMap.get(id);
    if (!old && cur) { added.push(cur); }
    else if (old && !cur) { removed.push(old); }
    else if (old && cur) {
      if (old.text !== cur.text || old.type !== cur.type || JSON.stringify(old.properties) !== JSON.stringify(cur.properties)) {
        changed.push({ id, oldText: old.text, newText: cur.text, oldType: old.type, newType: cur.type });
      } else {
        unchanged.push(old);
      }
    }
  }
  return { added, removed, changed, unchanged, addedCount: added.length, removedCount: removed.length, changedCount: changed.length };
}

interface VersionHistoryPanelProps {
  versionHistory: VersionEntry[];
  onClose: () => void;
  currentBlocks: Block[];
  currentTitle?: string;
  currentDb?: DatabaseSchema;
  onRestore: (version: VersionEntry) => void;
  onSelectiveRestore: (blocks: Block[]) => void;
  onRestoreDbView: (version: VersionEntry) => void;
}

export default function VersionHistoryPanel({ versionHistory, onClose, currentBlocks, currentTitle, currentDb, onRestore, onSelectiveRestore, onRestoreDbView }: VersionHistoryPanelProps) {
  const [selectedDiff, setSelectedDiff] = useState<BlockDiff | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[480px] max-h-[560px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <History size={15} />
            <span className="text-sm font-semibold">Version History</span>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {versionHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">No version history yet</div>
          ) : selectedDiff ? (
            <div className="space-y-2">
              <button onClick={() => setSelectedDiff(null)} className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1">
                <ChevronLeft size={12} /> Back to versions
              </button>
              <div className="rounded-lg border border-[var(--border)] p-2 space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mb-1">
                  <span className="text-[var(--success)] font-medium">+{selectedDiff.addedCount} added</span>
                  <span className="text-[var(--danger)] font-medium">-{selectedDiff.removedCount} removed</span>
                  <span className="text-[var(--accent)] font-medium">~{selectedDiff.changedCount} changed</span>
                </div>
                {selectedDiff.changed.map(c => (
                  <div key={c.id} className="rounded border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-2 text-[11px]">
                    <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] mb-1">
                      <span className="font-mono">{c.id.slice(0, 8)}</span>
                      {c.oldType !== c.newType && <span className="font-medium">{c.oldType} → {c.newType}</span>}
                    </div>
                    <div className="font-mono text-[10px] leading-relaxed">
                      <div className="text-[var(--danger)] line-through">- {c.oldText || "(empty)"}</div>
                      <div className="text-[var(--success)]">+ {c.newText || "(empty)"}</div>
                    </div>
                  </div>
                ))}
                {selectedDiff.added.map(b => (
                  <div key={b.id} className="rounded border border-[var(--success)]/20 bg-[var(--success)]/5 p-2 text-[11px]">
                    <div className="text-[var(--success)] font-mono text-[10px]">+ {b.text || "(empty)"}</div>
                  </div>
                ))}
                {selectedDiff.removed.map(b => (
                  <div key={b.id} className="rounded border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-2 text-[11px]">
                    <div className="text-[var(--danger)] line-through font-mono text-[10px]">- {b.text || "(empty)"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            versionHistory.map((v, i) => {
              const diff = i === 0 ? null : computeBlockDiff(versionHistory[i - 1].blocks, v.blocks);
              const hasDb = v.database && v.database.properties && v.database.properties.length > 0;
              return (
                <div key={v.id || i} className="rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--hover)]/30 transition">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="text-xs font-medium">{new Date(v.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-[var(--muted)]">{v.label || `Version ${versionHistory.length - i}`}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedDiff(diff)}
                        disabled={!diff}
                        className="rounded px-2 py-0.5 text-[10px] text-[var(--secondary)] hover:bg-[var(--hover)] disabled:opacity-30 cursor-pointer"
                      >
                        Diff
                      </button>
                      <button
                        onClick={() => onRestore(v)}
                        className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                  {diff && (diff.addedCount > 0 || diff.removedCount > 0 || diff.changedCount > 0) && (
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                      <span className="text-[var(--success)]">+{diff.addedCount}</span>
                      <span className="text-[var(--danger)]">-{diff.removedCount}</span>
                      <span className="text-[var(--accent)]">~{diff.changedCount}</span>
                    </div>
                  )}
                  {hasDb && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => onRestoreDbView(v)}
                        className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        Restore DB views/properties only (keep rows)
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
