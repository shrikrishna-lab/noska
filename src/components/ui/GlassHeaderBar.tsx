import React from "react";
import { Search, LayoutGrid, Filter, SlidersHorizontal, Plus } from "lucide-react";

interface GlassHeaderBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  placeholder?: string;
  onToggleLayout?: () => void;
  onToggleFilter?: () => void;
  filterActive?: boolean;
  onNewAction?: () => void;
  className?: string;
}

export function GlassHeaderBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search",
  onToggleLayout,
  onToggleFilter,
  filterActive,
  onNewAction,
  className = ""
}: GlassHeaderBarProps) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutText = isMac ? "⌘ + Space" : "Ctrl + Space";

  return (
    <div className={`flex items-center justify-between gap-4 select-none ${className}`}>
      {/* Translucent Floating Search Input */}
      <div className="relative flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search
            size={16}
            className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 pl-11 pr-24 rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-xl text-xs sm:text-sm text-[var(--text)] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-400/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] transition-all"
          />
          {/* Keyboard shortcut badge */}
          <div className="absolute right-3 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/10 text-[10.5px] font-semibold text-[var(--muted)] pointer-events-none shadow-2xs">
            {shortcutText}
          </div>
        </div>
      </div>

      {/* Right Circular Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleLayout && (
          <button
            onClick={onToggleLayout}
            title="Switch grid layout"
            className="h-10 w-10 rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 grid place-items-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <LayoutGrid size={16} />
          </button>
        )}

        {onToggleFilter && (
          <button
            onClick={onToggleFilter}
            title="Filter view"
            className={`h-10 w-10 rounded-full border backdrop-blur-xl grid place-items-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer ${
              filterActive
                ? "bg-blue-500 border-blue-600 text-white shadow-md"
                : "border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#15171e]/70 hover:bg-white/90 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Filter size={16} />
          </button>
        )}

        {onNewAction && (
          <button
            onClick={onNewAction}
            title="Create new item"
            className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">New</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default GlassHeaderBar;
