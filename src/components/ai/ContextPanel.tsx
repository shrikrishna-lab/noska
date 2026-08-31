import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, FileText, Clock, Brain, BarChart3, type LucideIcon } from 'lucide-react';
import { PageIcon } from '../PageIcon';

interface CollapsibleSectionProps {
  icon: LucideIcon;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}

function CollapsibleSection({ icon: Icon, label, defaultOpen = true, children, count }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
      >
        <div className={`w-3 h-3 flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronRight size={9} />
        </div>
        <Icon size={10} className="text-[var(--muted)]" />
        <span className="flex-1 text-left">{label}</span>
        {count !== undefined && (
          <span className="text-[9px] text-[var(--muted)] bg-[var(--surface-3)] px-1 rounded">{count}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContextPanel({ page, auditEvents = [], open, onToggle }) {
  const recentEvents = auditEvents?.slice(0, 5) || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="border-l border-[var(--border)] bg-[var(--sidebar)] overflow-hidden flex flex-col shrink-0"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-[var(--border)]">
            <span className="text-[10px] font-semibold text-[var(--text)] flex-1">Context</span>
            <button
              onClick={onToggle}
              className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
            >
              <ChevronRight size={11} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-[var(--border)]">
            {/* Current Page */}
            <CollapsibleSection icon={FileText} label="Current Page" count={page?.blocks?.length || 0}>
              {page ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-[var(--text)] truncate">{page.title || 'Untitled'}</div>
                  <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
                    <span>{page.blocks?.length || 0} blocks</span>
                    <span>·</span>
                    <PageIcon icon={page.icon} size={12} fallback="📝" />
                  </div>
                  {page.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {page.tags.map(t => (
                        <span key={t} className="px-1 py-0.5 rounded bg-[var(--accent)]/8 text-[8px] text-[var(--accent)]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-[var(--muted)] italic">No page selected</div>
              )}
            </CollapsibleSection>

            {/* Recent Audit Events */}
            <CollapsibleSection icon={Clock} label="Recent Activity" count={recentEvents.length}>
              {recentEvents.length > 0 ? (
                <div className="space-y-1">
                  {recentEvents.map((e, i) => (
                    <div key={e.id || i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: e.user_color || 'var(--accent)' }} />
                      <div className="min-w-0">
                        <div className="text-[9px] text-[var(--text-secondary)] truncate">{e.user_name} {e.action?.replace(/_/g, ' ')}</div>
                        <div className="text-[8px] text-[var(--muted)]">{e.detail?.slice(0, 40)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-[var(--muted)] italic">No recent activity</div>
              )}
            </CollapsibleSection>

            {/* AI Memory */}
            <CollapsibleSection icon={Brain} label="AI Memory">
              <div className="text-[10px] text-[var(--muted)] italic">Session memory active</div>
            </CollapsibleSection>

            {/* Token Usage */}
            <CollapsibleSection icon={BarChart3} label="Token Usage">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">Current session</span>
                <span className="text-[var(--muted)]">—</span>
              </div>
            </CollapsibleSection>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
