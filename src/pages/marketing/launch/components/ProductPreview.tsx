import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { FileText, Database, CheckSquare, Calendar, Sparkles, GitBranch, BookOpen } from 'lucide-react';

const SIDEBAR_ITEMS = [
  { icon: FileText, label: 'Notes', active: true },
  { icon: BookOpen, label: 'Wikis' },
  { icon: Database, label: 'Databases' },
  { icon: CheckSquare, label: 'Projects' },
  { icon: Calendar, label: 'Calendar' },
];

/**
 * Large floating product preview beneath the hero copy — a mocked-up
 * Noska window (editor + sidebar + kanban) with an AI panel, thought-graph
 * callout, and calendar mini-card floating around it at different depths.
 * Cursor position drives a soft parallax tilt across all three layers.
 */
export function ProductPreview() {
  const ref = useRef(null);
  const px = useSpring(useMotionValue(0.5), { stiffness: 60, damping: 20 });
  const py = useSpring(useMotionValue(0.5), { stiffness: 60, damping: 20 });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const mainX = useTransform(px, [0, 1], [-8, 8]);
  const mainY = useTransform(py, [0, 1], [-6, 6]);
  const aiX = useTransform(px, [0, 1], [-16, 16]);
  const aiY = useTransform(py, [0, 1], [-12, 12]);
  const graphX = useTransform(px, [0, 1], [12, -12]);
  const graphY = useTransform(py, [0, 1], [10, -10]);
  const calX = useTransform(px, [0, 1], [10, -10]);
  const calY = useTransform(py, [0, 1], [-8, 8]);

  return (
    <motion.div
      ref={ref}
      className="nl-preview-stage"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="nl-preview-main" style={{ x: mainX, y: mainY }}>
        <div className="nl-preview-bar">
          <span className="nl-preview-dot red" />
          <span className="nl-preview-dot yellow" />
          <span className="nl-preview-dot green" />
          <span className="nl-preview-bar-title">noska.app — Product Roadmap</span>
        </div>
        <div className="nl-preview-body">
          <div className="nl-preview-sidebar">
            {SIDEBAR_ITEMS.map(({ icon: Icon, label, active }) => (
              <div key={label} className={`nl-preview-sidebar-item ${active ? 'active' : ''}`}>
                <Icon size={13} strokeWidth={1.8} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="nl-preview-content">
            <div className="nl-preview-content-line" style={{ width: '58%', height: 14 }} />
            <div className="nl-preview-content-line" style={{ width: '88%' }} />
            <div className="nl-preview-content-line" style={{ width: '72%' }} />
            <div className="nl-preview-todo">
              <span className="nl-preview-check done"><CheckSquare size={9} /></span>
              <span>Draft the launch announcement</span>
            </div>
            <div className="nl-preview-todo">
              <span className="nl-preview-check" />
              <span>Wire up MCP server registry</span>
            </div>
            <div className="nl-preview-kanban">
              <div className="nl-preview-kanban-col">
                To do
                <div className="nl-preview-kanban-card">Design review</div>
              </div>
              <div className="nl-preview-kanban-col">
                Doing
                <div className="nl-preview-kanban-card">Automation rules</div>
              </div>
              <div className="nl-preview-kanban-col">
                Done
                <div className="nl-preview-kanban-card">Slash commands</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="nl-preview-float nl-preview-float-ai"
        style={{ x: aiX, y: aiY }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="nl-float-ai-row"><Sparkles size={13} /><span>Noska AI</span></div>
        <div className="nl-float-ai-line" style={{ width: '90%' }} />
        <div className="nl-float-ai-line" style={{ width: '65%' }} />
      </motion.div>

      <motion.div
        className="nl-preview-float nl-preview-float-graph"
        style={{ x: graphX, y: graphY }}
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <div className="nl-float-graph-header"><GitBranch size={11} style={{ marginRight: 5, verticalAlign: -1 }} />Connected</div>
        <svg viewBox="0 0 150 56" width="100%" height="44">
          <line x1="10" y1="14" x2="60" y2="34" stroke="var(--nl-border-strong)" strokeWidth="1.4" />
          <line x1="60" y1="34" x2="120" y2="12" stroke="var(--nl-border-strong)" strokeWidth="1.4" />
          <line x1="60" y1="34" x2="90" y2="46" stroke="var(--nl-border-strong)" strokeWidth="1.4" />
          <circle cx="10" cy="14" r="5" fill="var(--nl-accent)" opacity="0.7" />
          <circle cx="60" cy="34" r="6.5" fill="var(--nl-accent)" />
          <circle cx="120" cy="12" r="5" fill="var(--nl-success)" opacity="0.8" />
          <circle cx="90" cy="46" r="5" fill="var(--nl-accent)" opacity="0.5" />
        </svg>
      </motion.div>

      <motion.div
        className="nl-preview-float nl-preview-float-calendar"
        style={{ x: calX, y: calY }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <div className="nl-cal-grid">
          {Array.from({ length: 21 }).map((_, i) => (
            <span key={i} className={`nl-cal-cell ${i === 14 ? 'today' : [3, 7, 9, 17].includes(i) ? 'filled' : ''}`} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
