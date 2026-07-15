import React, { useState, useEffect, useRef } from "react";
import { Search, X, CornerDownLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FADE_IN_VARIANTS } from "./GraphAnimations";

export default function GraphSearch({ 
  pages, 
  onSelectNode, 
  onSearchChange,
  isOpen,
  onClose 
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSearchChange(val);
  };

  const handleClear = () => {
    setQuery("");
    onSearchChange("");
    if (inputRef.current) inputRef.current.focus();
  };

  const visiblePages = pages.filter((p) => !p.trashed);
  const matches = query.trim() 
    ? visiblePages.filter(p => p.title?.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (nodeId) => {
    onSelectNode(nodeId);
    setQuery("");
    onSearchChange("");
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && matches.length > 0) {
      handleSelect(matches[0].id);
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={FADE_IN_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute top-16 right-4 z-30 w-[300px] flex flex-col rounded-xl bg-[var(--elevated)]/90 backdrop-blur-md border border-[var(--border-strong)] p-3 shadow-2xl"
        >
          {/* Search Input field */}
          <div className="relative flex items-center gap-2 border border-[var(--border)] bg-[var(--surface)]/50 rounded-lg px-2.5 py-1.5 focus-within:border-[var(--accent)] transition-all">
            <Search size={14} className="text-[var(--secondary)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Search nodes by title..."
              className="w-full bg-transparent border-none text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none leading-none"
            />
            {query && (
              <button 
                onClick={handleClear}
                className="hover:text-[var(--text)] text-[var(--secondary)] cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Results list */}
          {query.trim() && (
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto mt-2.5 pr-0.5 scrollbar-thin">
              {matches.length > 0 ? (
                matches.map((node, index) => (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    className="w-full flex items-center justify-between text-left px-2.5 py-2 rounded-lg bg-[var(--surface)]/30 hover:bg-[var(--hover)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{node.icon || "📄"}</span>
                      <span className="text-xs font-medium text-[var(--text)] truncate">{node.title || "Untitled"}</span>
                    </div>
                    {index === 0 && (
                      <span className="text-[9px] text-[var(--muted)] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Enter <CornerDownLeft size={8} />
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-[11px] text-[var(--muted)] font-medium">
                  No matching nodes found.
                </div>
              )}
            </div>
          )}

          {/* Guidelines info */}
          <div className="text-[9px] text-[var(--muted)] mt-2 border-t border-[var(--border)] pt-2 flex items-center justify-between select-none">
            <span>Esc to close</span>
            <span>Enter to focus match</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
