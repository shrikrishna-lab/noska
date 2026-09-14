import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Tag,
  Link2,
  ChevronRight,
  ChevronLeft,
  Eye,
  Hand,
  MousePointer,
  Sparkles,
  Layers,
  Compass
} from "lucide-react";

interface GraphDiscoverySidebarProps {
  pages: any[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  linkFilters: { hierarchy: boolean; tag: boolean; mention: boolean };
  onLinkFilterChange: (filters: { hierarchy: boolean; tag: boolean; mention: boolean }) => void;
  onSelectNode: (pageId: string) => void;
  activeId?: string | null;
  totalLinksCount: number;
}

export default function GraphDiscoverySidebar({
  pages,
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  linkFilters,
  onLinkFilterChange,
  onSelectNode,
  activeId,
  totalLinksCount
}: GraphDiscoverySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const visiblePages = (pages || []).filter((p) => !p.trashed);

  // Compute tag frequencies
  const tagCounts: Record<string, number> = {};
  visiblePages.forEach((p) => {
    (p.tags || []).forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  const nodeCountText = visiblePages.length === 1 ? "1 node" : `${visiblePages.length} nodes`;
  const linkCountText = totalLinksCount === 1 ? "1 link" : `${totalLinksCount} links`;

  return (
    <div className="absolute top-15 right-4 z-40 pointer-events-none select-none flex items-start gap-2">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Collapse discovery panel" : "Expand discovery panel"}
        className="pointer-events-auto mt-1 w-7.5 h-7.5 rounded-full bg-white/90 dark:bg-[#181922]/90 backdrop-blur-2xl border border-black/10 dark:border-white/12 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
      >
        <motion.div animate={{ rotate: isOpen ? 0 : 180 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={13} strokeWidth={2.4} />
        </motion.div>
      </button>

      {/* Floating Panel (matching Reference Image 1) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="pointer-events-auto w-68 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin rounded-3xl bg-white/90 dark:bg-[#141620]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] p-4 flex flex-col gap-3.5 text-slate-800 dark:text-slate-200"
          >
            {/* Header: Title & Total Nodes */}
            <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-2xs">
                  <Compass size={13} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-bold tracking-tight">Graph Discovery</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-slate-500 font-semibold border border-black/[0.04] dark:border-white/[0.06]">
                {nodeCountText} • {linkCountText}
              </span>
            </div>

            {/* 1. Search Link Field ("ricerca link") */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search link or note..."
                className="w-full text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 pl-7 pr-3 py-1.5 outline-none text-[var(--text)] focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 2. Category & Tag Filters ("FILTRA PER") */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5">
                <span className="flex items-center gap-1">
                  <Filter size={10} /> Filter by Category
                </span>
                {selectedTag && (
                  <button
                    onClick={() => onSelectTag(null)}
                    className="text-blue-500 hover:underline cursor-pointer lowercase font-medium"
                  >
                    clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                <button
                  onClick={() => onSelectTag(null)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold transition cursor-pointer ${
                    !selectedTag
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                      : "bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:bg-black/[0.06]"
                  }`}
                >
                  All ({visiblePages.length})
                </button>
                {sortedTags.map(([tag, count]) => {
                  const isSel = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => onSelectTag(isSel ? null : tag)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-medium transition cursor-pointer ${
                        isSel
                          ? "bg-blue-600 text-white shadow-2xs font-semibold"
                          : "bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:bg-black/[0.06]"
                      }`}
                    >
                      <Tag size={9} className={isSel ? "text-white" : "text-slate-400"} />
                      <span>{tag}</span>
                      <span className="text-[9px] opacity-70 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Relationship Type Visualizer Legend ("VISUALIZZA") */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 flex items-center gap-1">
                <Eye size={10} /> Visualizer Links
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] transition cursor-pointer text-[11px] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
                    <span>Parent Hierarchy</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={linkFilters.hierarchy}
                    onChange={(e) =>
                      onLinkFilterChange({ ...linkFilters, hierarchy: e.target.checked })
                    }
                    className="accent-amber-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] transition cursor-pointer text-[11px] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-2xs" />
                    <span>Mentions & Links</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={linkFilters.mention}
                    onChange={(e) =>
                      onLinkFilterChange({ ...linkFilters, mention: e.target.checked })
                    }
                    className="accent-sky-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] transition cursor-pointer text-[11px] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                    <span>Shared Tags</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={linkFilters.tag}
                    onChange={(e) =>
                      onLinkFilterChange({ ...linkFilters, tag: e.target.checked })
                    }
                    className="accent-emerald-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* 4. Interactive Gesture & Navigation Hints */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-1 text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <MousePointer size={10} />
                <span>Click node for focal ray inspection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hand size={10} />
                <span>Drag background to pan view</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
