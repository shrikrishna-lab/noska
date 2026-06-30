import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import * as Icons from "lucide-react";
import { getFilteredCommands } from "../core/commands/CommandRegistry";
import { executeCommand } from "../core/commands/ActionExecutor";
import { blockFor } from "../utils/helpers";

export default function CommandPalette({ open, onClose, context = {} }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("commands"); // "commands" | "pages"
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pages, setPages] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlightedIndex(0);
      setMode("commands");
      setTimeout(() => inputRef.current?.focus(), 30);
      // Collect pages from context
      const ctxPages = context.pages || [];
      setPages(Array.isArray(ctxPages) ? ctxPages : []);
    }
  }, [open, context.pages]);

  const filteredCommands = getFilteredCommands(query, context)
    .filter((c) =>
      c.category === "Page actions" ||
      c.category === "Suggested" ||
      query.length > 0
    );

  const filteredPages = pages.filter((p) => {
    if (!query) return false;
    return p.title?.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 8);

  const results = [];
  if (mode === "pages" || (query.startsWith(">") && mode === "commands")) {
    const pageQuery = query.startsWith(">") ? query.slice(1).trim() : query;
    const fp = pages.filter((p) => p.title?.toLowerCase().includes(pageQuery.toLowerCase())).slice(0, 8);
    results.push(...fp.map((p) => ({ type: "page", page: p })));
  }
  // Show commands (always)
  results.splice(0, 0, ...filteredCommands.map((c) => ({ type: "command", cmd: c })));

  useEffect(() => {
    setHighlightedIndex((prev) => Math.min(prev, results.length - 1));
  }, [results.length]);

  const handleSelect = useCallback((item) => {
    if (item.type === "command") {
      const cmd = item.cmd;
      if (cmd.category === "Page actions") {
        executeCommand(cmd.id, context);
        onClose();
        return;
      }
      const page = context.page;
      const onBlocks = context.onBlocks;
      if (!page || !onBlocks) {
        onClose();
        return;
      }
      const focusedEl = document.activeElement?.closest?.(".noska-block");
      const focusedBlockId = focusedEl?.dataset?.blockId;
      const targetBlock = page.blocks?.find(b => b.id === focusedBlockId);
      if (targetBlock) {
        const onPatch = (patch) => {
          onBlocks((page.blocks || []).map((b) =>
            b.id === targetBlock.id ? { ...b, ...patch } : b
          ));
        };
        executeCommand(cmd.id, {
          ...context, block: targetBlock,
          text: targetBlock.text || "", onPatch,
          onDelete: () => onBlocks((page.blocks || []).filter(b => b.id !== targetBlock.id)),
          onAdd: (type, text) => {
            const nb = blockFor(type, text || "");
            const idx = page.blocks.findIndex(b => b.id === targetBlock.id);
            const next = [...page.blocks];
            next.splice(idx + 1, 0, nb);
            onBlocks(next);
          },
        });
      } else {
        const newBlock = blockFor(cmd.id, "");
        onBlocks([...(page.blocks || []), newBlock]);
        setTimeout(() => {
          document.querySelector(`[data-block-id="${newBlock.id}"] textarea`)?.focus();
        }, 50);
      }
    } else if (item.type === "page") {
      context.onNavigate?.(item.page.id);
    }
    onClose();
  }, [context, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query.startsWith(">")) {
        setQuery("");
      } else {
        onClose();
      }
    }
  }, [results, highlightedIndex, handleSelect, onClose, query]);

  const renderIcon = (iconName) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon size={14} /> : null;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[580px] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] shadow-[var(--shadow-floating)]"
          >
            {/* Search */}
            <div className="relative flex items-center border-b border-[var(--border)]">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder={query.startsWith(">") ? "Search pages..." : "Search commands and pages..."}
                className="w-full bg-transparent pl-10 pr-10 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto max-h-[320px] py-1 scrollbar-none">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                  {query.startsWith(">")
                    ? "No pages found"
                    : "No results — type to search commands, or > to search pages"}
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSelected = highlightedIndex === idx;

                  if (item.type === "command") {
                    const cmd = item.cmd;
                    return (
                      <button
                        key={`cmd-${cmd.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected ? "bg-[var(--accent)]/10" : ""
                        }`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--hover)] text-[var(--secondary)] shrink-0">
                          {renderIcon(cmd.icon)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[var(--text)] truncate">{cmd.title}</div>
                          <div className="text-[10px] text-[var(--muted)] truncate">{cmd.description || cmd.preview || ""}</div>
                        </div>
                        {cmd.shortcut && (
                          <span className="text-[9px] text-[var(--muted)] font-mono shrink-0">{cmd.shortcut}</span>
                        )}
                      </button>
                    );
                  }

                  if (item.type === "page") {
                    const p = item.page;
                    return (
                      <button
                        key={`page-${p.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected ? "bg-[var(--accent)]/10" : ""
                        }`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--hover)] text-[var(--secondary)] shrink-0">
                          {p.icon || renderIcon("FileText")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[var(--text)] truncate">{p.title || "Untitled"}</div>
                          <div className="text-[10px] text-[var(--muted)] truncate">
                            {p.blocks?.length || 0} blocks
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return null;
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 flex items-center gap-3 text-[10px] text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono text-[9px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono text-[9px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono text-[9px]">esc</kbd>
                Close
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono text-[9px]">&gt;</kbd>
                Search pages
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
