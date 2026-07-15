import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Keyboard, Blocks, ScrollText, LifeBuoy, ArrowRight } from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import './Resources.css';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Open the command palette' },
  { keys: ['Ctrl', 'N'], desc: 'Create a new page' },
  { keys: ['Ctrl', 'Z'], desc: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
  { keys: ['Ctrl', 'D'], desc: 'Duplicate the current page' },
  { keys: ['Ctrl', '\\'], desc: 'Toggle the sidebar' },
  { keys: ['Ctrl', 'Shift', 'E'], desc: 'Export the current page' },
  { keys: ['Ctrl', 'Shift', 'C'], desc: 'Open the web clipper' },
  { keys: ['Ctrl', 'Shift', 'V'], desc: 'Start voice capture' },
  { keys: ['Alt', '←', '/', '→'], desc: 'Jump between pages' },
  { keys: ['?'], desc: 'Open help' },
];

const GUIDES = [
  {
    icon: Blocks,
    title: '33 block types, explained',
    desc: 'A tour of every block type — from simple text to databases, code, and embeds — with what each one is actually for.',
  },
  {
    icon: ScrollText,
    title: 'Views: table, board, graph & more',
    desc: 'The same database, eight different lenses. When to reach for a timeline vs. a board vs. the graph view.',
  },
  {
    icon: LifeBuoy,
    title: 'Security & encryption practices',
    desc: 'How row-level security, Supabase Auth, and client-side AES-GCM encryption fit together to protect your workspace.',
  },
];

export default function Resources() {
  return (
    <div className="resources-wrapper">
      <section className="resources-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1>Learn Noska, faster.</h1>
          <p>Real shortcuts, real guides, and a straight answer on how the security model works — no marketing fluff.</p>
        </motion.div>
      </section>

      <section className="resources-guides mkt-container">
        <Reveal className="section-header">
          <h2>Guides</h2>
        </Reveal>
        <Stagger className="guides-grid">
          {GUIDES.map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} variants={staggerItem} className="guide-card">
              <Icon size={22} strokeWidth={1.6} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </Stagger>
      </section>

      <section className="resources-shortcuts mkt-container">
        <Reveal className="section-header">
          <h2><Keyboard size={26} strokeWidth={1.6} /> Keyboard shortcuts</h2>
          <p>Every shortcut below is live in the app today — try them once you're in your workspace.</p>
        </Reveal>
        <Stagger className="shortcuts-grid">
          {SHORTCUTS.map((s) => (
            <motion.div key={s.desc} variants={staggerItem} className="shortcut-row">
              <div className="shortcut-keys">
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </div>
              <span className="shortcut-desc">{s.desc}</span>
            </motion.div>
          ))}
        </Stagger>
      </section>

      <section className="resources-cta mkt-container">
        <Reveal className="cta-banner">
          <h2>Want the details in-app?</h2>
          <p>The Help Center and API Console live directly inside your workspace once you sign in.</p>
          <div className="cta-btn-group">
            <Link to="/login" className="btn btn-primary btn-lg">
              Open your workspace <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
