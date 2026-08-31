import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, RotateCcw, Search, AlertTriangle, Check, X, ChevronDown, Compass, Edit3, Zap, Eye, Command } from 'lucide-react';
import {
  getAllShortcuts,
  setShortcut,
  resetShortcut,
  resetAllShortcuts,
  findConflicts,
  onShortcutsChange,
  type ShortcutDef,
} from '../lib/shortcuts';
import { cn } from '../lib/utils';

// ── Key Capture Hook ───────────────────────────────────────────
function useKeyCapture(onCapture: (shortcut: string) => void, enabled: boolean) {
  const [recording, setRecording] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = useCallback(() => {
    bufferRef.current = [];
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setRecording(false);
    bufferRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled || !recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      const key = e.key === ' ' ? 'Space' : e.key === 'Escape' ? '' : e.key;
      if (key && !['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
      }

      if (parts.length > 0) {
        bufferRef.current = parts;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (bufferRef.current.length > 0) {
          onCapture(bufferRef.current.join('+'));
        }
        stopRecording();
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, recording, onCapture, stopRecording]);

  return { recording, startRecording, stopRecording };
}

// ── Category Config ────────────────────────────────────────────
const CATEGORY_ORDER = ['Navigation', 'Editing', 'Actions', 'View'];

const CATEGORY_CONFIG: Record<
  string,
  { labelColor: string; icon: React.ReactNode; glowColor: string; badgeBg: string }
> = {
  Navigation: {
    labelColor: 'text-blue-600 dark:text-sky-400',
    icon: <Compass size={15} className="text-blue-600 dark:text-sky-400" />,
    glowColor: 'shadow-[0_0_20px_rgba(37,99,235,0.15)] dark:shadow-[0_0_20px_rgba(56,189,248,0.15)]',
    badgeBg: 'bg-blue-50 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-sky-500/25',
  },
  Editing: {
    labelColor: 'text-emerald-600 dark:text-emerald-400',
    icon: <Edit3 size={15} className="text-emerald-600 dark:text-emerald-400" />,
    glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] dark:shadow-[0_0_20px_rgba(52,211,153,0.15)]',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
  },
  Actions: {
    labelColor: 'text-purple-600 dark:text-purple-400',
    icon: <Zap size={15} className="text-purple-600 dark:text-purple-400" />,
    glowColor: 'shadow-[0_0_20px_rgba(147,51,234,0.15)] dark:shadow-[0_0_20px_rgba(192,132,252,0.15)]',
    badgeBg: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/25',
  },
  View: {
    labelColor: 'text-amber-600 dark:text-amber-400',
    icon: <Eye size={15} className="text-amber-600 dark:text-amber-400" />,
    glowColor: 'shadow-[0_0_20px_rgba(217,119,6,0.15)] dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
  },
};

// ── Component ──────────────────────────────────────────────────
export default function ShortcutsSettings() {
  const [shortcuts, setShortcuts] = useState(() => getAllShortcuts());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Navigation: false,
    Editing: false,
    Actions: false,
    View: false,
  });

  useEffect(() => {
    const unsub = onShortcutsChange(() => setShortcuts(getAllShortcuts()));
    return () => { unsub(); };
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof shortcuts> = {};
    CATEGORY_ORDER.forEach(c => { groups[c] = []; });
    shortcuts.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    if (search) {
      const q = search.toLowerCase();
      Object.keys(groups).forEach(cat => {
        groups[cat] = groups[cat].filter(s =>
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.current.toLowerCase().includes(q)
        );
      });
    }
    return groups;
  }, [shortcuts, search]);

  const totalCustom = shortcuts.filter(s => s.isCustom).length;

  const handleCapture = useCallback((shortcut: string) => {
    if (!editingId) return;
    const conflictIds = findConflicts(editingId, shortcut);
    setConflicts(conflictIds);
    setShortcut(editingId, shortcut);
    setEditingId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editingId]);

  const { recording, startRecording, stopRecording } = useKeyCapture(handleCapture, editingId !== null);

  const handleEdit = useCallback((id: string) => {
    if (editingId === id) {
      setEditingId(null);
      stopRecording();
    } else {
      setConflicts([]);
      setEditingId(id);
      startRecording();
    }
  }, [editingId, startRecording, stopRecording]);

  const handleReset = useCallback((id: string) => {
    resetShortcut(id);
    setConflicts([]);
  }, []);

  const handleResetAll = useCallback(() => {
    resetAllShortcuts();
    setConflicts([]);
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="max-w-2xl space-y-5 pb-16 font-sans">
      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight font-serif text-[#1c1b18] dark:text-white">
            Keyboard Shortcuts
          </h1>
          <p className="text-xs text-[#706c64] dark:text-white/60 mt-1">
            Click any shortcut to reassign it. Press your desired key combination, then release.
            {totalCustom > 0 && (
              <span className="ml-2 text-blue-600 dark:text-sky-400 font-medium">
                ({totalCustom} custom modified)
              </span>
            )}
          </p>
        </div>
        {totalCustom > 0 && (
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-500/20"
          >
            <RotateCcw size={12} />
            Reset All
          </button>
        )}
      </div>

      {/* Search Bar matching Settings Theme */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c887f] dark:text-white/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search shortcuts..."
          className="w-full pl-9 pr-8 py-2.5 bg-[#f4efe6] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 rounded-2xl text-xs text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/25 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all shadow-inner"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c887f] hover:text-[#1c1b18] dark:text-white/40 dark:hover:text-white transition cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Conflict Warning */}
      {conflicts.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle size={14} />
          <span>Conflicts with: {conflicts.join(', ')}</span>
        </div>
      )}

      {/* Saved Confirmation */}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-400">
          <Check size={14} />
          <span>Shortcut successfully updated!</span>
        </div>
      )}

      {/* Recording Indicator */}
      {recording && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 text-xs text-blue-700 dark:text-sky-300 animate-pulse shadow-sm">
          <Keyboard size={14} />
          <span className="font-semibold">Recording: Press your new key combination...</span>
          <button
            onClick={stopRecording}
            className="ml-auto text-blue-700/60 dark:text-white/60 hover:text-blue-900 dark:hover:text-white transition cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Sleek Category Pill Groups (Matching Settings Aesthetic) */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          const isExpanded = search.length > 0 || !!expandedCategories[cat];
          const config = CATEGORY_CONFIG[cat] || {
            labelColor: 'text-[#1c1b18] dark:text-white',
            icon: null,
            glowColor: '',
            badgeBg: 'bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-white/70 border-[#e8e4db] dark:border-white/10',
          };

          return (
            <div
              key={cat}
              className={cn(
                "rounded-2xl transition-all duration-300 overflow-hidden border shadow-xs",
                isExpanded
                  ? "border-[#ded8cc] dark:border-white/15 bg-[#f8f6f0] dark:bg-[#171a23]"
                  : "border-[#e8e4db] dark:border-white/[0.08] bg-[#f4efe6] dark:bg-[#181b24] hover:bg-[#ede8df] dark:hover:bg-[#202430] hover:scale-[1.004]"
              )}
            >
              {/* Category Header Pill Button */}
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition cursor-pointer select-none group"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("text-xs font-bold tracking-tight flex items-center gap-1.5", config.labelColor)}>
                    {cat}
                  </span>
                  <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ede8df] dark:bg-black/40 text-[#706c64] dark:text-white/60 border border-[#e0dad0] dark:border-white/5">
                    {items.length}
                  </span>
                </div>

                <ChevronDown
                  size={15}
                  className={cn(
                    "text-[#8c887f] dark:text-white/40 group-hover:text-[#1c1b18] dark:group-hover:text-white transition-transform duration-300",
                    isExpanded ? "rotate-180 text-[#1c1b18] dark:text-white/90" : ""
                  )}
                />
              </button>

              {/* Collapsible Shortcut List with Framer Motion */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-[#e8e4db] dark:divide-white/[0.06] border-t border-[#e8e4db] dark:border-white/[0.06] bg-[#f8f6f0] dark:bg-[#14161f]/80">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[#1c1b18] dark:text-white/90 tracking-tight">
                              {item.label}
                            </div>
                            <div className="text-[10.5px] text-[#706c64] dark:text-white/45 mt-0.5 truncate">
                              {item.description}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.isCustom && (
                              <button
                                onClick={() => handleReset(item.id)}
                                className="w-6 h-6 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/15 flex items-center justify-center text-[#706c64] hover:text-[#1c1b18] dark:text-white/50 dark:hover:text-white transition cursor-pointer"
                                title="Reset to default shortcut"
                              >
                                <RotateCcw size={11} />
                              </button>
                            )}

                            {/* Crisp Keycap Button */}
                            <button
                              onClick={() => handleEdit(item.id)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95",
                                editingId === item.id
                                  ? "bg-blue-50 dark:bg-sky-500/25 border-blue-400 dark:border-sky-400 text-blue-700 dark:text-sky-200 ring-2 ring-blue-400/40 dark:ring-sky-400/40 animate-pulse shadow-sm"
                                  : "bg-white dark:bg-[#232734] border-[#e4dfd5] dark:border-white/15 text-[#1c1b18] dark:text-white/95 hover:border-[#1c1b18]/40 dark:hover:border-white/35 hover:bg-[#faf8f5] dark:hover:bg-[#2b3040] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                              )}
                              title={editingId === item.id ? "Press keys now to bind shortcut" : "Click to change shortcut"}
                            >
                              {formatShortcut(item.current)}
                            </button>

                            {item.isCustom && (
                              <span className="text-[9.5px] font-bold text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-500/15 border border-blue-200 dark:border-sky-500/30 px-1.5 py-0.5 rounded-md font-mono">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function formatShortcut(s: string): string {
  return s
    .replace(/\+/g, ' + ')
    .replace(/Ctrl/g, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace(/Alt/g, navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    .replace(/Shift/g, navigator.platform.includes('Mac') ? '⇧' : 'Shift');
}
