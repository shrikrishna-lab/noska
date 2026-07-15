import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Languages, BarChart3, CheckSquare, PenLine, ListTodo, Table, LayoutGrid, Brain, Wand2, BookOpen, FileText, Code2 } from 'lucide-react';

const AI_ACTIONS = [
  { id: 'summarize', icon: BookOpen, label: 'Summarize', prompt: 'Summarize this page in 3 concise bullet points' },
  { id: 'rewrite', icon: PenLine, label: 'Rewrite', prompt: 'Rewrite this page to be clearer and more concise' },
  { id: 'translate', icon: Languages, label: 'Translate', prompt: 'Translate this page to {lang}. Keep the structure.' },
  { id: 'analyze', icon: BarChart3, label: 'Analyze', prompt: 'Analyze this page and give 5 key insights' },
  { id: 'extract', icon: CheckSquare, label: 'Extract Tasks', prompt: 'Extract all action items and tasks from this page' },
  { id: 'improve', icon: Wand2, label: 'Improve Writing', prompt: 'Improve the writing quality of this page' },
  { id: 'table', icon: Table, label: 'Generate Table', prompt: 'Create a structured table from the content on this page' },
  { id: 'database', icon: LayoutGrid, label: 'Database', prompt: 'Convert this page content into a database' },
  { id: 'explain', icon: Brain, label: 'Explain', prompt: 'Explain the content of this page in simple terms' },
  { id: 'grammar', icon: FileText, label: 'Fix Grammar', prompt: 'Fix any grammar and spelling issues on this page' },
  { id: 'outline', icon: ListTodo, label: 'Outline', prompt: 'Create a structured outline with sections and subsections' },
  { id: 'docs', icon: Code2, label: 'Documentation', prompt: 'Generate API documentation from this content' }
];

export default function AIActionsCard({ onSendPrompt }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
      >
        <Sparkles size={10} className="text-[var(--accent)]" />
        <span>AI Actions</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <ChevronDown size={10} />
        </motion.div>
        <span className="text-[9px] text-[var(--muted)] ml-auto">{AI_ACTIONS.length} actions</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-1 px-3 pb-3">
              {AI_ACTIONS.map((action) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSendPrompt?.(action.prompt)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/40 hover:bg-[var(--hover)] hover:border-[var(--border-hover)] px-2 py-1.5 text-left transition"
                >
                  <action.icon size={10} className="text-[var(--accent)] shrink-0" />
                  <span className="text-[10px] text-[var(--text-secondary)] truncate">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
