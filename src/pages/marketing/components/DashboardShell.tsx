import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Home, Sparkles, Calendar, Bell, Star, ChevronDown,
  PanelLeft, ArrowLeft, ArrowRight, LayoutGrid, Plus, Lock,
  Link2, Bookmark, Settings, Undo2, Redo2, Sun, Check, GitBranch,
} from 'lucide-react';
import './DashboardShell.css';

/**
 * A faithful recreation of Noska's real workspace chrome — the sidebar and
 * topbar structure mirror the actual app (src/components/Sidebar.jsx and
 * Topbar.jsx): workspace switcher header, search bar, Workspace/Favorites/
 * Recents/Private Documents sections, footer toolbar + "New Creation"
 * button, and a topbar with the real Document/Canvas/Graph mode switcher
 * (including its animated pill) plus Share/Ask AI/undo-redo controls.
 *
 * This is intentionally a hand-built visual recreation rather than an
 * import of the authenticated app's own components — those expect live
 * app state, Supabase data, and dozens of handler props that don't exist
 * on the public marketing bundle. Colors are the app's actual light-theme
 * tokens (see src/index.css `.light`), hardcoded locally under `.dash-shell`
 * so the marketing bundle never depends on the app's theme runtime.
 *
 * `mode` drives which content pane renders (doc / canvas / graph / ai) —
 * callers can hold this in state and change it on a timer, on hover, or
 * (as in ScrollShowcase) driven by scroll position, producing a "scrubbed
 * video" effect entirely with real DOM + CSS, no video asset.
 */
export function DashboardShell({ mode = 'doc', instanceId = 'a', className = '' }) {
  return (
    <div className={`dash-shell ${className}`}>
      <DashSidebar />
      <div className="dash-main">
        <DashTopbar mode={mode} instanceId={instanceId} />
        <div className="dash-content">
          <AnimatePresence mode="wait">
            {mode === 'doc' && <DashDoc key="doc" />}
            {mode === 'canvas' && <DashBoard key="canvas" />}
            {mode === 'graph' && <DashGraph key="graph" />}
            {mode === 'ai' && <DashAI key="ai" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const fadeProps = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

const NAV_ITEMS = [
  { icon: Home, label: 'Home' },
  { icon: Sparkles, label: 'AI Workspace' },
  { icon: Calendar, label: 'Calendar' },
  { icon: Bell, label: 'Inbox' },
];

const RECENTS = [
  { icon: '📄', title: 'Product principles', meta: '128w · 2m ago' },
  { icon: '🗂️', title: 'Roadmap database', meta: '64w · 1h ago' },
];

const DOC_TREE = [
  { icon: '📄', title: 'Weekly planning', depth: 0 },
  { icon: '📄', title: 'Product principles', depth: 0, active: true },
  { icon: '📄', title: 'Reading notes', depth: 1 },
];

function DashSidebar() {
  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-header">
        <button className="dash-ws-btn" tabIndex={-1}>
          <span className="dash-logo-box"><img src="/logo.png" alt="" /></span>
          <span className="dash-ws-info">
            <span className="dash-ws-name">My Workspace</span>
          </span>
          <ChevronDown size={10} />
        </button>
      </div>

      <div className="dash-search">
        <Search size={11} />
        <span>Search workspace...</span>
        <kbd>⌘K</kbd>
      </div>

      <div className="dash-scroll">
        <DashSection title="Workspace">
          {NAV_ITEMS.map(({ icon: Icon, label }, i) => (
            <div className={`dash-nav-item ${i === 0 ? 'active' : ''}`} key={label}>
              <Icon size={12} strokeWidth={1.8} /><span>{label}</span>
            </div>
          ))}
        </DashSection>

        <DashSection title="Favorites">
          <div className="dash-nav-item compact">
            <Star size={10} className="dash-star" /><span>Product principles</span>
          </div>
        </DashSection>

        <DashSection title="Recents">
          {RECENTS.map((r) => (
            <div className="dash-recent-item" key={r.title}>
              <span className="dash-recent-icon">{r.icon}</span>
              <span className="dash-recent-text">
                <span className="dash-recent-title">{r.title}</span>
                <span className="dash-recent-meta">{r.meta}</span>
              </span>
            </div>
          ))}
        </DashSection>

        <DashSection title="Private Documents">
          {DOC_TREE.map((d) => (
            <div
              key={d.title}
              className={`dash-tree-item ${d.active ? 'active' : ''}`}
              style={{ paddingLeft: 10 + d.depth * 12 }}
            >
              <span>{d.icon}</span><span>{d.title}</span>
            </div>
          ))}
        </DashSection>
      </div>

      <div className="dash-sidebar-footer">
        <div className="dash-toolbar-row">
          <PanelLeft size={12} /><ArrowLeft size={12} /><ArrowRight size={12} /><LayoutGrid size={12} /><Plus size={12} />
        </div>
        <button className="dash-new-btn" tabIndex={-1}>
          <Plus size={10} /><span>New Creation</span><kbd>Ctrl+N</kbd>
        </button>
      </div>

      <div className="dash-user-row">
        <span className="dash-user-avatar">👤</span>
        <span className="dash-user-info">
          <span className="dash-user-name">Alex Rivera</span>
          <span className="dash-user-email">alex@workspace.com</span>
        </span>
        <ChevronDown size={10} />
      </div>
    </aside>
  );
}

function DashSection({ title, children }) {
  return (
    <div className="dash-section">
      <div className="dash-section-title">{title}</div>
      <div className="dash-section-body">{children}</div>
    </div>
  );
}

const MODES = [
  { id: 'doc', label: 'Document' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'graph', label: 'Graph' },
];

function DashTopbar({ mode, instanceId }) {
  const pillId = `dash-mode-pill-${instanceId}`;
  // The AI mode isn't one of the three view-switcher tabs in the real app
  // (Ask AI opens a side panel over whichever view is active) — while
  // scrubbing into "ai" mode here, leave the pill on "doc" underneath and
  // let the Ask AI button itself light up, matching real behavior.
  const activeTab = mode === 'ai' ? 'doc' : mode;

  return (
    <div className="dash-topbar">
      <div className="dash-topbar-title">
        <span>📝</span>
        <span className="dash-topbar-page-title">Product principles</span>
        <span className="dash-private-badge"><Lock size={8} /> Private</span>
      </div>

      <div className="dash-mode-switch">
        {MODES.map((m) => (
          <button key={m.id} className={`dash-mode-btn ${activeTab === m.id ? 'active' : ''}`} tabIndex={-1}>
            {activeTab === m.id && (
              <motion.div
                layoutId={pillId}
                className="dash-mode-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="dash-mode-label">{m.label}</span>
          </button>
        ))}
      </div>

      <span className="dash-save-state"><Check size={10} /> Saved</span>
      <button className="dash-share-btn" tabIndex={-1}><Lock size={10} /> Share <ChevronDown size={9} /></button>
      <span className="dash-icon-btn"><Link2 size={12} /></span>
      <span className="dash-icon-btn"><Bookmark size={12} /></span>
      <button className={`dash-ai-btn ${mode === 'ai' ? 'active' : ''}`} tabIndex={-1}>
        <Sparkles size={11} /> Ask AI
      </button>
      <span className="dash-icon-btn hide-sm"><Settings size={12} /></span>
      <span className="dash-icon-btn hide-sm"><Undo2 size={12} /></span>
      <span className="dash-icon-btn hide-sm"><Redo2 size={12} /></span>
      <span className="dash-icon-btn"><Sun size={12} /></span>
    </div>
  );
}

function DashDoc() {
  return (
    <motion.div className="dash-doc" {...fadeProps}>
      <h4>Product principles</h4>
      <div className="dash-doc-line" style={{ width: '92%' }} />
      <div className="dash-doc-line" style={{ width: '76%' }} />
      <div className="dash-doc-line" style={{ width: '84%' }} />
      <div className="dash-doc-todo">
        <span className="dash-check"><Check size={9} /></span>
        <span>Draft the onboarding flow</span>
      </div>
      <div className="dash-doc-todo muted">
        <span className="dash-check empty" />
        <span>Share with the team</span>
      </div>
    </motion.div>
  );
}

const BOARD_COLUMNS = [
  {
    key: 'todo', label: 'Not started', dot: '#9CA3AF', cards: [
      { icon: '📄', title: 'Update onboarding copy', tag: 'Docs' },
      { icon: '🗂️', title: 'Review campaign assets', tag: 'Design' },
    ]
  },
  {
    key: 'progress', label: 'In progress', dot: '#5B7FA6', cards: [
      { icon: '✨', title: 'Ship graph view physics', tag: 'Engineering' },
      { icon: '📊', title: 'Weekly status report', tag: 'Ops' },
    ]
  },
  {
    key: 'done', label: 'Done', dot: '#6E8A6C', cards: [
      { icon: '✅', title: 'Spaced repetition queue', tag: 'Shipped' },
    ]
  },
];

function DashBoard() {
  return (
    <motion.div className="dash-board" {...fadeProps}>
      {BOARD_COLUMNS.map((col) => (
        <div className="dash-board-col" key={col.key}>
          <div className="dash-board-col-header">
            <span className="dash-board-dot" style={{ background: col.dot }} />
            <span>{col.label}</span>
            <span className="dash-board-count">{col.cards.length}</span>
          </div>
          <div className="dash-board-cards">
            {col.cards.map((c) => (
              <div className="dash-board-card" key={c.title}>
                <div className="dash-board-card-top"><span>{c.icon}</span><span>{c.title}</span></div>
                <span className="dash-board-card-tag">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Root node sits top-center with children spreading downward — a bigger,
// airier layout that reads clearly even at hero size (reference: a single
// bold dark root with lighter blue leaves branching below it).
const GRAPH_NODES = [
  { x: 130, y: 30 },  // 0 root (primary/dark)
  { x: 62, y: 78 },   // 1
  { x: 148, y: 92 },  // 2
  { x: 200, y: 76 },  // 3
  { x: 96, y: 138 },  // 4
  { x: 168, y: 148 }, // 5
];
const GRAPH_EDGES = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5]];

function DashGraph() {
  return (
    <motion.div className="dash-graph" {...fadeProps}>
      <svg viewBox="0 0 260 170" className="dash-graph-svg">
        {GRAPH_EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={GRAPH_NODES[a].x} y1={GRAPH_NODES[a].y}
            x2={GRAPH_NODES[b].x} y2={GRAPH_NODES[b].y}
            className="dash-graph-edge"
          />
        ))}
        {GRAPH_NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            r={i === 0 ? 9 : 6}
            className={`dash-graph-node ${i === 0 ? 'primary' : ''}`}
            animate={{ cy: [n.y, n.y - 5, n.y] }}
            transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            initial={{ cy: n.y }}
          />
        ))}
      </svg>
      <span className="dash-graph-caption"><GitBranch size={11} /> 6 connected pages</span>
    </motion.div>
  );
}

function DashAI() {
  return (
    <motion.div className="dash-ai" {...fadeProps}>
      <div className="dash-ai-header"><Sparkles size={12} /> Ask AI about this page</div>
      <div className="dash-ai-prompt">
        <span className="dash-ai-label">You asked</span>
        <p>"What's covered on this page?"</p>
      </div>
      <div className="dash-ai-response">
        <p>This page covers the product principles guiding Noska's editor — clarity first, structure that follows understanding, and calm defaults.</p>
      </div>
    </motion.div>
  );
}
