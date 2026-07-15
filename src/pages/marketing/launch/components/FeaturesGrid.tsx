import { motion } from 'framer-motion';
import {
  Sparkles, FileText, Layers, BookOpen, Database, Table2, Kanban,
  CalendarDays, Users, Command, LayoutTemplate, Workflow, Plug, Search, RefreshCw,
} from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Draft, expand, and rewrite content inline — powered by your choice of AI model.' },
  { icon: FileText, title: 'Rich Document Editor', desc: 'A calm, block-based editor with 33 block types — text, tables, code, embeds, and more.' },
  { icon: Layers, title: 'Nested Pages', desc: 'Build a page tree as deep as you need, organized exactly how your team thinks.' },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Turn scattered notes into a searchable, linked company wiki over time.' },
  { icon: Database, title: 'Databases', desc: 'Structured rows and properties that power every view your work needs.' },
  { icon: Table2, title: 'Tables', desc: 'Sort, filter, and group data with the flexibility of a spreadsheet, built in.' },
  { icon: Kanban, title: 'Kanban Boards', desc: 'Drag cards across stages — the same rows as your table, just a different lens.' },
  { icon: CalendarDays, title: 'Calendar Views', desc: 'See dated work laid out across days, weeks, and months automatically.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Real-time presence, cursors, and comments so teams write together, live.' },
  { icon: Command, title: 'Slash Commands', desc: 'Type "/" to insert any block, embed, or AI action without leaving the keyboard.' },
  { icon: LayoutTemplate, title: 'Templates', desc: 'Start from a library of ready-made layouts instead of a blank page every time.' },
  { icon: Workflow, title: 'Automation', desc: 'Trigger actions on your data — status changes, reminders, and recurring tasks.' },
  { icon: Plug, title: 'MCP Integrations', desc: 'Connect external tools and context providers directly into Noska AI.' },
  { icon: Search, title: 'AI Search', desc: 'Ask questions across your whole workspace and get answers, not just links.' },
  { icon: RefreshCw, title: 'Real-Time Sync', desc: 'Every edit propagates instantly across every device and collaborator.' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

/**
 * The core feature grid — 15 cards, each lifting with a soft shadow and a
 * gradient border sweep on hover, icon nudging into a slight tilt. Staggers
 * in three-wide as it scrolls into view.
 */
export function FeaturesGrid() {
  return (
    <section id="features" className="nl-features">
      <div className="nl-container">
        <div className="nl-section-header">
          <span className="nl-eyebrow"><Sparkles size={12} /> Inside the workspace</span>
          <h2>Everything your team needs, built in.</h2>
          <p>Fifteen capabilities that usually live in fifteen different tools — here, they share one page.</p>
        </div>

        <div className="nl-features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="nl-feature-card"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <div className="nl-feature-icon"><Icon size={18} strokeWidth={1.7} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
