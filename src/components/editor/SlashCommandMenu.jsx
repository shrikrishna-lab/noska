import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { getFilteredCommands, getCommand } from "../../core/commands/CommandRegistry";
import * as Icons from "lucide-react";

const CATEGORIES_ORDER = [
  "Suggested", "Basic blocks", "Media", "Layout",
  "Database", "Advanced blocks", "Inline", "Embeds"
];

const CATEGORY_LABELS = {
  "Basic blocks": "Basic blocks",
  "Media": "Media",
  "Layout": "Layout",
  "Database": "Database",
  "Advanced blocks": "Advanced",
  "Inline": "Inline",
  "Embeds": "Embeds",
  "Suggested": "Suggested"
};

export default forwardRef(function SlashCommandMenu({ open, onClose, onSelect, position }, menuRef) {
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [previewCmd, setPreviewCmd] = useState(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  const fuzzyMatch = (query, text) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  const SUGGESTED_IDS = ["text", "h1", "h2", "bullet", "todo", "image", "divider", "toggle", "callout", "database-inline"];

  const getFilteredGroups = () => {
    const all = getFilteredCommands(search);
    const groups = {};
    CATEGORIES_ORDER.forEach((cat) => { groups[cat] = []; });
    all.forEach((cmd) => {
      if (cmd.category === "Page actions") return;
      const cat = !search && SUGGESTED_IDS.includes(cmd.id) ? "Suggested" : cmd.category || "Basic blocks";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    });
    return CATEGORIES_ORDER
      .map((name) => ({ name, items: groups[name] || [] }))
      .filter((g) => g.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  const getFlatVisible = () => {
    const result = [];
    for (const group of filteredGroups) {
      for (const item of group.items) {
        result.push(item);
      }
    }
    return result;
  };

  const flatItems = getFlatVisible();

  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightedIndex(-1);
      setPreviewCmd(null);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && flatItems[highlightedIndex]) {
        onSelect?.(flatItems[highlightedIndex].id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [flatItems, highlightedIndex, onSelect, onClose]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelectorAll("[data-slash-item]")[highlightedIndex];
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (highlightedIndex >= 0 && flatItems[highlightedIndex]) {
      setPreviewCmd(flatItems[highlightedIndex]);
    } else {
      setPreviewCmd(null);
    }
  }, [highlightedIndex, flatItems]);

  const renderIcon = (iconName) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon size={14} className="shrink-0 text-[var(--secondary)]" /> : null;
  };

  let globalIndexCounter = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 3 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          style={{
            width: 320,
            ...(position ? { position: "fixed", top: position.top, left: position.left } : {}),
          }}
          className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-[var(--shadow-floating)] z-[130] max-h-[420px]"
        >
          {/* Search bar */}
          <div className="relative border-b border-[var(--border)]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Search blocks..."
              className="w-full bg-transparent px-8 py-2.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Groups list */}
          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none py-1">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--muted)]">No blocks found</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.name} className="flex flex-col">
                  <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] mb-1">
                    {CATEGORY_LABELS[group.name] || group.name}
                  </div>
                  {group.items.map((cmd) => {
                    const currentIdx = globalIndexCounter;
                    globalIndexCounter += 1;
                    const isSelected = highlightedIndex === currentIdx;

                    return (
                      <button
                        key={cmd.id}
                        data-slash-item
                        onClick={() => { onSelect?.(cmd.id); onClose(); }}
                        onMouseEnter={() => setHighlightedIndex(currentIdx)}
                        className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-[var(--text)] transition-colors cursor-pointer ${
                          isSelected ? "bg-[var(--hover)]" : ""
                        }`}
                      >
                        {renderIcon(cmd.icon)}
                        <span className="flex-1 truncate">{cmd.title}</span>
                        {cmd.shortcut && (
                          <span className="text-[9px] text-[var(--muted)] font-mono">{cmd.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Preview Tooltip */}
          <AnimatePresence>
            {previewCmd && previewCmd.preview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-[var(--border)] bg-[var(--surface)] overflow-hidden"
              >
                <div className="px-3 py-2 text-[10px] leading-relaxed text-[var(--secondary)]">
                  {previewCmd.description && (
                    <div className="font-medium text-[var(--text)] mb-0.5">{previewCmd.title}</div>
                  )}
                  <div className="text-[var(--muted)]">{previewCmd.preview}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Close menu</span>
            <kbd className="px-1 rounded bg-[var(--hover)] border border-[var(--border)] font-mono">esc</kbd>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
