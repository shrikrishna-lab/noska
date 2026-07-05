import { motion } from 'framer-motion';
import {
  Star, Type, Heading1, Heading2, Heading3, List, CheckSquare, Image as ImageIcon,
  BookOpen, Table2, Sparkles, Globe, ChevronLeft, ChevronRight, Search as SearchIcon,
  Plus, ZoomIn, GitBranch, FileText, Edit3, MessageSquare,
} from 'lucide-react';
import { MacWindow } from './MacWindow';

/**
 * Four real-UI recreations, one per landing-page story section — each
 * matches a specific real screen in the app rather than an abstract
 * line-and-icon placeholder. Built as hand-recreated DOM/CSS (same
 * approach as DashboardShell) rather than embedded screenshots, so they
 * stay crisp at any size and need no external image asset.
 */

/* ---------------------------------------------------------------- */
/* 1. Capture — the slash-command menu                                */
/* ---------------------------------------------------------------- */
const SLASH_COMMANDS = [
  { icon: Type, title: 'Text', desc: 'Plain text block — the default block type', suggested: true },
  { icon: Heading1, title: 'Heading 1', desc: 'Large section heading', kbd: '#' },
  { icon: Heading2, title: 'Heading 2', desc: 'Medium section heading', kbd: '##' },
  { icon: List, title: 'Bulleted list', desc: 'Unordered list item', kbd: '-' },
  { icon: CheckSquare, title: 'To-do list', desc: 'Checkable task item', kbd: '[]' },
];

export function CaptureMockup() {
  return (
    <MacWindow title="Usecase" className="story-mock-window">
      <div className="story-slash-page">
        <div className="story-slash-page-title"><FileText size={13} /> Workspace</div>
        <div className="story-slash-input-row">
          <span className="story-slash-grip">⠿</span>
          <span className="story-slash-caret-icon">○</span>
          <span className="story-slash-char">/</span>
        </div>
        <div className="story-slash-menu">
          <div className="story-slash-search">
            <SearchIcon size={12} />
            <span>Search or type a command...</span>
          </div>
          <div className="story-slash-section-label"><Star size={9} /> SUGGESTED</div>
          {SLASH_COMMANDS.map(({ icon: Icon, title, desc, kbd, suggested }) => (
            <div key={title} className={`story-slash-item ${suggested ? 'active' : ''}`}>
              <span className="story-slash-item-icon"><Icon size={13} strokeWidth={1.7} /></span>
              <span className="story-slash-item-text">
                <span className="story-slash-item-title">{title}</span>
                <span className="story-slash-item-desc">{desc}</span>
              </span>
              {kbd && <kbd>{kbd}</kbd>}
            </div>
          ))}
        </div>
      </div>
    </MacWindow>
  );
}

/* ---------------------------------------------------------------- */
/* 2. Organize — table view morphing into a calendar view             */
/* ---------------------------------------------------------------- */
const TABLE_COLS = ['Day 1', 'Day 2', 'Day 3'];
const TABLE_ROW = ['Change UI', 'Add New Features', 'Test Changes'];
const CAL_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function OrganizeMockup() {
  return (
    <div className="story-organize-stack">
      <motion.div
        className="story-mini-table"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="story-mini-table-row header">
          {TABLE_COLS.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="story-mini-table-row">
          {TABLE_ROW.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="story-mini-table-actions">
          <span>Add row</span><span>Add column</span>
        </div>
      </motion.div>

      <motion.div
        className="story-mini-calendar"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="story-mini-cal-toolbar">
          <Table2 size={12} /> <span>Calendar</span>
          <span className="story-mini-cal-toolbar-search"><SearchIcon size={10} /></span>
        </div>
        <div className="story-mini-cal-nav">
          <ChevronLeft size={12} />
          <span>July 2026</span>
          <ChevronRight size={12} />
          <span className="story-mini-cal-today">Today</span>
        </div>
        <div className="story-mini-cal-grid">
          {CAL_DAYS.map((d) => <span key={d} className="story-mini-cal-dow">{d}</span>)}
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`story-mini-cal-cell ${i === 4 ? 'today' : ''}`}>{i > 2 ? i - 2 : ''}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 3. Connect — the Thought Graph mind-map canvas                     */
/* ---------------------------------------------------------------- */
const GRAPH_MOCK_NODES = [
  { icon: Sparkles, label: 'Getting Started', x: 18, y: 30, primary: true },
  { icon: FileText, label: 'Test', x: 68, y: 20 },
  { icon: FileText, label: 'New page', x: 10, y: 68 },
  { icon: FileText, label: 'New page', x: 58, y: 78 },
];

export function ConnectMockup() {
  return (
    <div className="story-graph-canvas">
      <div className="story-graph-toolbar">
        <span className="story-graph-toolbar-label">General Notes <span>4 nodes</span></span>
        <span className="story-graph-toolbar-actions">
          <Sparkles size={12} /> <SearchIcon size={12} /> <ZoomIn size={12} />
        </span>
      </div>
      <svg className="story-graph-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="24" y1="34" x2="64" y2="72" className="story-graph-edge" />
      </svg>
      {GRAPH_MOCK_NODES.map(({ icon: Icon, label, x, y, primary }) => (
        <motion.div
          key={label + x}
          className={`story-graph-node ${primary ? 'primary' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
        >
          <Icon size={12} strokeWidth={1.8} />
          <span>{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 4. Remember — flashcard-style block cards with Edit/Comment        */
/* ---------------------------------------------------------------- */
const REMEMBER_CARDS = [
  { tag: 'H1', tagClass: 'h1', title: 'Getting Started', hash: '36b4' },
  { tag: 'TEXT', tagClass: 'text', title: 'Welcome to Noska! Here are a few tips to get moving fast.', hash: '72ae' },
  { tag: 'BULLET', tagClass: 'bullet', title: 'Type "/" anywhere to insert a block', hash: '7738' },
  { tag: 'BULLET', tagClass: 'bullet', title: 'Press "Ctrl+K" to open the command palette', hash: '9f52' },
];

export function RememberMockup() {
  return (
    <div className="story-remember-grid">
      {REMEMBER_CARDS.map((card, i) => (
        <motion.div
          key={card.hash}
          className="story-remember-card"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
        >
          <div className="story-remember-card-head">
            <span className="story-remember-grip">⠿</span>
            <span className={`story-remember-tag tag-${card.tagClass}`}>{card.tag}</span>
          </div>
          <p>{card.title}</p>
          <div className="story-remember-card-foot">
            <span className="story-remember-hash">{card.hash}</span>
            <span className="story-remember-actions">
              <Edit3 size={11} /> <MessageSquare size={11} />
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
