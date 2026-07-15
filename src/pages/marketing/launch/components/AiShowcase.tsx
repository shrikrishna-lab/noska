import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Database, Workflow } from 'lucide-react';

const TABS = [
  { id: 'ai', icon: Sparkles, label: 'AI Assistant' },
  { id: 'docs', icon: FileText, label: 'Docs' },
  { id: 'databases', icon: Database, label: 'Databases' },
  { id: 'automation', icon: Workflow, label: 'Automation' },
];

const COPY = {
  ai: {
    title: 'Ask Noska anything about your workspace.',
    desc: 'Bring your own key or use the built-in assistant to draft, summarize, and answer questions grounded in what you\'ve actually written — with MCP servers extending it to your other tools.',
  },
  docs: {
    title: 'Write like it\'s just text.',
    desc: 'A block-based editor with slash commands for tables, code, embeds, and callouts — nothing gets in the way of getting the thought down.',
  },
  databases: {
    title: 'One dataset, every view.',
    desc: 'Table, board, and calendar views all read from the same rows — reorganize your data without ever duplicating it.',
  },
  automation: {
    title: 'Let the busywork run itself.',
    desc: 'Trigger status changes, reminders, and recurring tasks automatically as your data changes.',
  },
};

/**
 * Interactive tabbed showcase covering the "AI" and "Docs" nav anchors —
 * swaps a live typing demo (AI tab) or a static mock preview for the other
 * tabs, so the AI story isn't just a screenshot.
 */
export function AiShowcase() {
  const [active, setActive] = useState('ai');
  const [aiText, setAiText] = useState('');
  const [typing, setTyping] = useState(false);

  const runDemo = () => {
    if (typing) return;
    setTyping(true);
    setAiText('');
    const full = 'Here\'s a draft: this launch page should lead with the one-line pitch, show real product structure, and end with a single clear next step — join the waitlist.';
    let i = 0;
    const interval = setInterval(() => {
      if (i < full.length) {
        setAiText((prev) => prev + full.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        setTyping(false);
      }
    }, 18);
  };

  const current = COPY[active];

  return (
    <section id="ai" className="nl-features" style={{ paddingTop: 0 }}>
      <div className="nl-container">
        <div className="nl-section-header">
          <span className="nl-eyebrow"><Sparkles size={12} /> Noska AI</span>
          <h2>Intelligence woven through the whole workspace.</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="nl-btn"
              style={{
                background: active === id ? 'var(--nl-text)' : 'var(--nl-bg-alt)',
                color: active === id ? '#fff' : 'var(--nl-text-secondary)',
                border: `1px solid ${active === id ? 'var(--nl-text)' : 'var(--nl-border-strong)'}`,
                padding: '10px 18px',
                fontSize: 13.5,
              }}
            >
              <Icon size={15} strokeWidth={1.8} /> {label}
            </button>
          ))}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 40,
            background: 'var(--nl-bg-alt)',
            border: '1px solid var(--nl-border)',
            borderRadius: 'var(--nl-radius-lg)',
            padding: 44,
            alignItems: 'center',
            minHeight: 300,
          }}
        >
          <div>
            <h3 style={{ fontSize: 26, marginBottom: 12, lineHeight: 1.28 }}>{current.title}</h3>
            <p style={{ fontSize: 15, color: 'var(--nl-text-secondary)', lineHeight: 1.6 }}>{current.desc}</p>
          </div>

          <div>
            {active === 'ai' ? (
              <div style={{ background: 'var(--nl-card)', border: '1px solid var(--nl-border)', borderRadius: 14, padding: 20, boxShadow: 'var(--nl-shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--nl-accent-ink)', marginBottom: 14 }}>
                  <Sparkles size={15} /> Ask Noska AI
                </div>
                <div style={{ background: 'var(--nl-bg)', border: '1px solid var(--nl-border)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
                  "Draft a summary of this launch page's goal."
                </div>
                <div style={{ background: 'var(--nl-accent-tint)', border: '1px solid var(--nl-border)', padding: 12, borderRadius: 8, minHeight: 78, fontSize: 13, lineHeight: 1.55 }}>
                  {aiText}
                  {typing && <span style={{ animation: 'nl-blink 0.8s infinite' }}>|</span>}
                </div>
                <button className="nl-btn nl-btn-primary nl-btn-sm" style={{ marginTop: 14 }} onClick={runDemo} disabled={typing}>
                  <Sparkles size={13} /> {typing ? 'Thinking…' : aiText ? 'Ask again' : 'Ask AI'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--nl-border-strong)' }}>
                {active === 'docs' && <FileText size={64} strokeWidth={1} />}
                {active === 'databases' && <Database size={64} strokeWidth={1} />}
                {active === 'automation' && <Workflow size={64} strokeWidth={1} />}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
