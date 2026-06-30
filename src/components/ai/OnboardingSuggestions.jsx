import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, BarChart3, ListTodo, Sparkles, BookOpen } from 'lucide-react';

const SUGGESTIONS = [
  { icon: FileText, label: 'Continue writing', prompt: 'Help me continue writing the current page' },
  { icon: Search, label: 'Ask about workspace', prompt: 'What pages do I have in my workspace?' },
  { icon: BarChart3, label: 'Analyze page', prompt: 'Analyze this page and give me 5 key insights' },
  { icon: ListTodo, label: 'Extract tasks', prompt: 'Extract all action items and tasks from this page' },
  { icon: Sparkles, label: 'Generate ideas', prompt: 'Brainstorm 10 creative ideas related to this topic' },
  { icon: BookOpen, label: 'Summarize', prompt: 'Summarize this page in 3 concise bullet points' }
];

export default function OnboardingSuggestions({ onSend }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-lg"
      >
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
          <span className="text-xl">✦</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Noska AI</h2>
        <p className="text-sm text-[var(--muted)] mb-8 max-w-sm leading-relaxed">
          Ask me anything about your workspace or use the suggestions below.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-2 w-full max-w-md"
      >
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSend?.(s.prompt)}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 hover:bg-[var(--hover)] hover:border-[var(--border-hover)] px-3 py-2.5 text-left transition"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/8 flex items-center justify-center shrink-0">
              <s.icon size={13} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[12px] font-medium text-[var(--text)] leading-tight">{s.label}</div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5 line-clamp-1">{s.prompt}</div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-[10px] text-[var(--muted)] flex items-center gap-1.5"
      >
        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
        Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[9px] font-mono border border-[var(--border)]">⌘K</kbd> for quick actions
      </motion.p>
    </div>
  );
}
