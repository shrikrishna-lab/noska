import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, ListTodo, Search, Lightbulb, ArrowUpRight } from 'lucide-react';
import type { Page } from '../../lib/supabaseService';

interface OnboardingSuggestionsProps {
  page?: Page | null;
  onSend?: (prompt: string) => void;
}

export default function OnboardingSuggestions({
  page,
  onSend
}: OnboardingSuggestionsProps) {
  const quickActions = React.useMemo(() => {
    if (page?.title && page.title !== "Untitled") {
      return [
        { label: 'Summarize page', prompt: `Summarize "${page.title}" in 3 key points.` },
        { label: 'Extract action items', prompt: `Extract all action items and tasks from "${page.title}".` },
        { label: 'Improve writing', prompt: `Polish and improve the clarity of "${page.title}".` },
        { label: 'Brainstorm ideas', prompt: `Brainstorm next steps and ideas based on "${page.title}".` }
      ];
    }
    return [
      { label: 'Search workspace', prompt: 'What pages do I have in my workspace?' },
      { label: 'Brainstorm ideas', prompt: 'Brainstorm 10 creative project ideas with outlines.' },
      { label: 'Draft document', prompt: 'Help me draft a clean document structure.' },
      { label: 'Weekly plan', prompt: 'Create an organized weekly task breakdown.' }
    ];
  }, [page]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl mx-auto px-4">
      {quickActions.map((action, i) => (
        <motion.button
          key={action.label}
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.04 }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSend?.(action.prompt)}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hover:border-[var(--border-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-all shadow-2xs"
        >
          <Sparkles size={11} className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
          <span>{action.label}</span>
          <ArrowUpRight size={11} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      ))}
    </div>
  );
}
