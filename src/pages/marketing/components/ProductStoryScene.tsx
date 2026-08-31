import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Lock, Users, Check, Share2, Bookmark, Sparkles, ImagePlus, Mic,
  FileText, GitBranch, MessageSquare, BookOpen, Network, MousePointer2,
} from 'lucide-react';

const MODES = ['Document', 'Canvas', 'Graph'];

// One entry per story step — drives which topbar mode tab lights up, the
// cover color, and the inspector panel's stats, so the page visibly
// "grows" (more words/blocks/backlinks) as the story advances.
const STEP_META = [
  { mode: 'Document', words: 0, blocks: 0, headings: 0, backlinks: 0, cover: 'sage' },
  { mode: 'Document', words: 24, blocks: 3, headings: 1, backlinks: 0, cover: 'sage' },
  { mode: 'Document', words: 48, blocks: 5, headings: 1, backlinks: 0, cover: 'purple' },
  { mode: 'Document', words: 58, blocks: 7, headings: 2, backlinks: 1, cover: 'blue' },
  { mode: 'Graph', words: 58, blocks: 7, headings: 2, backlinks: 4, cover: 'blue' },
  { mode: 'Document', words: 74, blocks: 9, headings: 2, backlinks: 4, cover: 'orange' },
  { mode: 'Document', words: 132, blocks: 14, headings: 4, backlinks: 9, cover: 'orange' },
  { mode: 'Graph', words: 148, blocks: 16, headings: 4, backlinks: 12, cover: 'purple' },
];

/**
 * A faithful, richly-detailed recreation of Noska's real in-app editor
 * screen — breadcrumb + view-mode tabs + collaboration/share controls in
 * the topbar, a colored cover banner with its own toolbar, the page
 * title, a content pane that changes per story step, and the right-hand
 * details/inspector panel (Knowledge Score + block/word/backlink stats).
 * Used by the "Product story" scroll section so the visual is a real
 * workspace screen rather than an abstract icon-and-line placeholder.
 */
export function ProductStoryScene({ stepIndex }) {
  const meta = STEP_META[stepIndex] ?? STEP_META[0];
  const isFinale = stepIndex === STEP_META.length - 1;

  return (
    <div className="pss-scene-wrap">
      <div className="pss-frame">
        <div className="pss-topbar">
          <div className="pss-breadcrumb">
            <ChevronRight size={11} className="pss-breadcrumb-chevron" />
            <span className="pss-breadcrumb-icon">✦</span>
            <span className="pss-breadcrumb-title">Getting Started</span>
            <span className="pss-private-badge"><Lock size={8} /> Private</span>
          </div>

          <div className="pss-mode-tabs">
            {MODES.map((m) => (
              <span key={m} className={`pss-mode-tab ${meta.mode === m ? 'active' : ''}`}>{m}</span>
            ))}
          </div>

          <span className="pss-collab-hint hide-sm">Join Collaboration</span>
          <span className="pss-saved hide-sm"><Check size={10} /> Saved</span>
          <span className="pss-share-btn"><Share2 size={10} /> Share</span>
          <span className="pss-icon-chip hide-sm"><Bookmark size={11} /></span>
          <span className="pss-ai-chip"><Sparkles size={10} /> New AI chat</span>
        </div>

        <div className="pss-body">
          <div className="pss-main">
            <div className={`pss-cover tint-${meta.cover}`}>
              <div className="pss-cover-toolbar">
                <span><ImagePlus size={10} /> Change cover</span>
                <span className="hide-sm"><Mic size={10} /> Voice capture</span>
                <span className="pss-online-pill"><Users size={9} /> 1 online</span>
              </div>
            </div>

            <div className="pss-page-head">
              <span className="pss-page-icon">✦</span>
              <h4>Getting Started</h4>
            </div>

            <div className="pss-content-pane">
              <AnimatePresence mode="wait">
                <StoryPane key={stepIndex} stepIndex={stepIndex} />
              </AnimatePresence>
            </div>
          </div>

          <div className="pss-inspector hide-sm">
            <div className="pss-inspector-tabs">
              <span className="active">Overview</span><span>Stats</span><span>Details</span>
            </div>

            <div className="pss-knowledge-card">
              <div className="pss-knowledge-ring">
                <motion.span
                  key={meta.words}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {Math.min(99, Math.round(meta.words / 1.4))}
                </motion.span>
              </div>
              <div className="pss-knowledge-text">
                <span className="pss-knowledge-label">Knowledge Score</span>
                <span className="pss-knowledge-sub">{meta.words} words · {meta.blocks} blocks</span>
              </div>
            </div>

            <div className="pss-details-label">DETAILS</div>
            <div className="pss-details-list">
              <DetailRow label="Blocks" value={meta.blocks} />
              <DetailRow label="Words" value={meta.words} />
              <DetailRow label="Headings" value={meta.headings} />
              <DetailRow label="Backlinks" value={meta.backlinks} />
              <DetailRow label="Updated" value="just now" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFinale && (
          <motion.div
            className="pss-float pss-float-ai"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="pss-float-ai-row"><Sparkles size={12} /> Ask Noska anything…</div>
            <div className="pss-float-ai-pill"><Sparkles size={10} /> Summarize this page</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="pss-detail-row">
      <span>{label}</span>
      <motion.span key={String(value)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {value}
      </motion.span>
    </div>
  );
}

const paneMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
};

function StoryPane({ stepIndex }) {
  switch (stepIndex) {
    case 0:
      return (
        <motion.div className="pss-pane pss-pane-blank" {...paneMotion}>
          <span className="pss-blank-caret" />
          <span className="pss-blank-hint">Type "/" for commands, or just start writing…</span>
        </motion.div>
      );
    case 1:
      return (
        <motion.div className="pss-pane" {...paneMotion}>
          <div className="pss-line" style={{ width: '88%' }} />
          <div className="pss-line" style={{ width: '72%' }} />
          <div className="pss-line" style={{ width: '80%' }} />
        </motion.div>
      );
    case 2:
      return (
        <motion.div className="pss-pane" {...paneMotion}>
          <div className="pss-line" style={{ width: '88%' }} />
          <div className="pss-line" style={{ width: '72%' }} />
          <div className="pss-ai-callout">
            <Sparkles size={12} /> <span>AI expanded this into three clear next steps.</span>
          </div>
        </motion.div>
      );
    case 3:
      return (
        <motion.div className="pss-pane" {...paneMotion}>
          <div className="pss-mini-table">
            <div className="pss-mini-table-row header"><span>Task</span><span>Owner</span><span>Status</span></div>
            <div className="pss-mini-table-row"><span>Draft outline</span><span>You</span><span className="pss-pill done">Done</span></div>
            <div className="pss-mini-table-row"><span>Share with team</span><span>You</span><span className="pss-pill">To do</span></div>
          </div>
        </motion.div>
      );
    case 4:
      return (
        <motion.div className="pss-pane pss-pane-graph" {...paneMotion}>
          <svg viewBox="0 0 220 130" className="pss-graph-svg">
            <line x1="110" y1="24" x2="50" y2="70" className="pss-graph-edge" />
            <line x1="110" y1="24" x2="170" y2="70" className="pss-graph-edge" />
            <line x1="110" y1="24" x2="110" y2="100" className="pss-graph-edge" />
            <circle cx="110" cy="24" r="8" className="pss-graph-node primary" />
            <circle cx="50" cy="70" r="6" className="pss-graph-node" />
            <circle cx="170" cy="70" r="6" className="pss-graph-node" />
            <circle cx="110" cy="100" r="6" className="pss-graph-node" />
          </svg>
          <span className="pss-graph-caption"><GitBranch size={11} /> 4 connected pages</span>
        </motion.div>
      );
    case 5:
      return (
        <motion.div className="pss-pane" {...paneMotion}>
          <div className="pss-line" style={{ width: '80%' }} />
          <div className="pss-collab-row">
            <span className="pss-avatar" style={{ background: '#7c3aed' }}>A</span>
            <span className="pss-avatar" style={{ background: '#ec4899' }}>M</span>
            <span className="pss-cursor-label"><MousePointer2 size={11} style={{ color: '#7c3aed' }} /> Maya is editing…</span>
          </div>
          <div className="pss-comment-row"><MessageSquare size={11} /> "Looks great, ship it!"</div>
        </motion.div>
      );
    case 6:
      return (
        <motion.div className="pss-pane" {...paneMotion}>
          <div className="pss-wiki-tree">
            <div className="pss-wiki-item"><BookOpen size={12} /> Company Wiki</div>
            <div className="pss-wiki-item depth1"><FileText size={12} /> Onboarding</div>
            <div className="pss-wiki-item depth1"><FileText size={12} /> Engineering</div>
            <div className="pss-wiki-item depth2"><FileText size={12} /> Getting Started</div>
          </div>
        </motion.div>
      );
    case 7:
    default:
      return (
        <motion.div className="pss-pane pss-pane-graph" {...paneMotion}>
          <svg viewBox="0 0 260 150" className="pss-graph-svg">
            <line x1="130" y1="22" x2="60" y2="66" className="pss-graph-edge" />
            <line x1="130" y1="22" x2="130" y2="82" className="pss-graph-edge" />
            <line x1="130" y1="22" x2="200" y2="64" className="pss-graph-edge" />
            <line x1="60" y1="66" x2="34" y2="118" className="pss-graph-edge" />
            <line x1="130" y1="82" x2="150" y2="128" className="pss-graph-edge" />
            <line x1="200" y1="64" x2="222" y2="116" className="pss-graph-edge" />
            <circle cx="130" cy="22" r="9" className="pss-graph-node primary" />
            <circle cx="60" cy="66" r="6" className="pss-graph-node" />
            <circle cx="130" cy="82" r="6" className="pss-graph-node" />
            <circle cx="200" cy="64" r="6" className="pss-graph-node" />
            <circle cx="34" cy="118" r="5" className="pss-graph-node" />
            <circle cx="150" cy="128" r="5" className="pss-graph-node" />
            <circle cx="222" cy="116" r="5" className="pss-graph-node" />
          </svg>
          <span className="pss-graph-caption"><Network size={11} /> Everything connected</span>
        </motion.div>
      );
  }
}
