import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { COMMAND_ACTIONS } from "@/lib/navigation";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = COMMAND_ACTIONS.filter(
    (a) => a.label.toLowerCase().includes(query.toLowerCase()) || a.keywords?.some((k) => k.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (index: number) => {
    const action = filtered[index];
    if (!action) return;
    if (action.perform === "navigate" && action.payload) {
      navigate(action.payload);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); handleSelect(selectedIndex); }
    if (e.key === "Escape") { onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
              <div className="flex items-center gap-3 border-b px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search or type a command..."
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 && (
                  <p className="p-3 text-center text-sm text-muted-foreground">No results found.</p>
                )}
                {filtered.map((action, i) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      i === selectedIndex ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex-1">{action.label}</span>
                    <span className="text-[10px] text-muted-foreground">{action.group}</span>
                    {action.shortcut && <kbd className="rounded border bg-muted px-1.5 text-[10px]">{action.shortcut}</kbd>}
                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                  </button>
                ))}
              </div>
              {filtered.length > 0 && (
                <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
                  <span className="rounded bg-muted px-1">↑↓</span> Navigate{' '}
                  <span className="rounded bg-muted px-1">↵</span> Select{' '}
                  <span className="rounded bg-muted px-1">ESC</span> Close
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
