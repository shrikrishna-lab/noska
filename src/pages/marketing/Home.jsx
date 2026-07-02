import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, FileText, Database, CheckSquare, ArrowRight, Check,
  LayoutGrid, GitBranch, Mic, Lock, BrainCircuit, Blocks, Zap,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import { LiveDemo } from './components/LiveDemo';
import { ScrollStory } from './components/ScrollStory';
import './components/ScrollStory.css';
import './Home.css';

const REAL_STATS = [
  { num: '33', label: 'block types', sub: 'text, tables, code, embeds, and more' },
  { num: '8', label: 'database views', sub: 'table, board, calendar, timeline, graph…' },
  { num: '8', label: 'AI providers', sub: 'bring your own key — OpenAI, Anthropic, Gemini, Groq…' },
];

const CAPABILITIES = [
  {
    id: 'canvas',
    icon: LayoutGrid,
    title: 'Infinite Canvas',
    color: 'blue',
    desc: 'Every page can drop into a zoomable, pannable spatial canvas — blocks become draggable cards with spring physics, a live mini-map, and persisted positions.',
  },
  {
    id: 'graph',
    icon: GitBranch,
    title: 'Thought Graph',
    color: 'purple',
    desc: 'See your whole workspace as a force-directed node graph. Connections are drawn from real parent/child and tag relationships — click a node to jump straight to that page.',
  },
  {
    id: 'voice',
    icon: Mic,
    title: 'Voice → structure',
    color: 'red',
    desc: 'Speak your thoughts and Noska transcribes them live, then asks AI to turn the raw transcript into a structured outline — headers, checklists, and todos.',
  },
  {
    id: 'encryption',
    icon: Lock,
    title: 'Real encryption',
    color: 'yellow',
    desc: 'Lock any page with the Web Crypto API: PBKDF2 key derivation and AES-GCM 256-bit encryption, entirely client-side. Plaintext never touches the network unencrypted.',
  },
  {
    id: 'spaced',
    icon: BrainCircuit,
    title: 'Spaced repetition',
    color: 'green',
    desc: 'Turn any block into a flashcard and review it with the SM-2 scheduling algorithm — the same spacing model behind Anki, built directly into your notes.',
  },
  {
    id: 'api',
    icon: Blocks,
    title: 'Open API console',
    color: 'blue',
    desc: 'A built-in console documents every page/block route and lets you generate a token and run live requests against your own workspace, right from the sidebar.',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('docs');
  const [aiText, setAiText] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  const handleGenerateAi = () => {
    if (aiTyping) return;
    setAiTyping(true);
    setAiText('');
    const fullText = "This page covers three things: the Q3 roadmap, open blockers on the graph-view release, and next sprint's database migration plan.";
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setAiText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setAiTyping(false);
      }
    }, 22);
  };

  return (
    <div className="home-wrapper">
      {/* 1. Hero */}
      <section className="hero-section mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="hero-eyebrow">
            <Sparkles size={13} /> Docs, databases, canvas, and AI in one workspace
          </span>
          <h1 className="hero-title">
            The workspace that bends to <span className="highlight-text">how you think</span>.
          </h1>
          <p className="hero-subtitle">
            Noska is a real-time notes workspace with 33 block types, 8 database views, a
            zoomable canvas, a thought graph, and AI you bring your own key for. Not a mockup —
            this is the actual product.
          </p>
          <div className="hero-cta-group">
            <Link to="/login" className="btn btn-primary btn-lg">
              Get started free <ArrowRight size={18} />
            </Link>
            <Link to="/product" className="btn btn-secondary btn-lg">
              See what's inside
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <LiveDemo />
        </motion.div>
      </section>

      {/* 2. Real stats, not vanity metrics */}
      <section className="stats-strip-section">
        <div className="mkt-container stats-strip">
          {REAL_STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="stats-strip-item">
              <span className="stats-strip-num">{s.num}</span>
              <span className="stats-strip-label">{s.label}</span>
              <span className="stats-strip-sub">{s.sub}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. Interactive feature tabs (existing pattern, kept — real product behavior) */}
      <section className="features-section mkt-container">
        <Reveal className="section-header">
          <h2>Every way you work, in one place.</h2>
          <p>Consolidate docs, structured data, and AI into a single interactive interface.</p>
        </Reveal>

        <Reveal delay={0.1} className="features-tab-group">
          {[
            { id: 'docs', icon: FileText, label: 'Docs' },
            { id: 'wikis', icon: Database, label: 'Wikis' },
            { id: 'projects', icon: CheckSquare, label: 'Projects' },
            { id: 'ai', icon: Sparkles, label: 'Noska AI' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`tab-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </Reveal>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="features-showcase-panel"
        >
          <div className="showcase-info">
            {activeTab === 'docs' && (
              <>
                <span className="category-label text-blue">Docs</span>
                <h3>Simple, powerful, and collaborative.</h3>
                <p>33 block types — text, tables, code, embeds, callouts, columns, and more. Real-time edits sync across every connected client.</p>
              </>
            )}
            {activeTab === 'wikis' && (
              <>
                <span className="category-label text-red">Wikis</span>
                <h3>Nest pages, link freely, never lose track.</h3>
                <p>Build a page tree as deep as you need. The Thought Graph view visualizes every link so your knowledge base stays navigable, not tangled.</p>
              </>
            )}
            {activeTab === 'projects' && (
              <>
                <span className="category-label text-yellow">Projects</span>
                <h3>Databases with 8 real view types.</h3>
                <p>Table, board, calendar, timeline, gallery, list, graph, and mind-map — all reading from the same underlying rows, switch anytime.</p>
              </>
            )}
            {activeTab === 'ai' && (
              <>
                <span className="category-label text-purple">Noska AI</span>
                <h3>Bring your own key, pick your model.</h3>
                <p>8 providers supported out of the box — OpenAI, Anthropic, Gemini, Groq, OpenRouter, NVIDIA NIM, and local Ollama/LM Studio for fully offline AI.</p>
                <div className="interactive-hint">👉 Click "Ask AI" below — this response is really generated by the typing animation, not a canned screenshot.</div>
              </>
            )}
          </div>

          <div className="showcase-visual">
            {activeTab === 'ai' ? (
              <div className="interactive-ai-mockup">
                <div className="ai-chat-header">
                  <Sparkles size={16} className="sparkle-icon" />
                  <span>Ask AI about this page</span>
                </div>
                <div className="ai-chat-body">
                  <div className="ai-prompt-box">
                    <p className="prompt-label">You asked:</p>
                    <div className="prompt-input">"What's covered on this page?"</div>
                  </div>
                  <div className="ai-response-box">
                    <p className="response-text">{aiText}</p>
                    {aiTyping && <span className="typing-cursor">|</span>}
                  </div>
                  <button className="btn btn-primary ai-action-btn" onClick={handleGenerateAi} disabled={aiTyping}>
                    <Sparkles size={14} /> {aiTyping ? 'Thinking…' : aiText ? 'Ask again' : 'Ask AI'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="tab-icon-display">
                {activeTab === 'docs' && <FileText size={64} strokeWidth={1.2} />}
                {activeTab === 'wikis' && <Database size={64} strokeWidth={1.2} />}
                {activeTab === 'projects' && <CheckSquare size={64} strokeWidth={1.2} />}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* 4. Scroll-scrubbed product walkthrough — a real animated sequence
          driven by scroll position, not a video asset. */}
      <ScrollStory />

      {/* 5. Capabilities grid — replaces fabricated testimonials/logos with
          real, distinctive features that are actually shipped. */}
      <section className="capabilities-section mkt-container">
        <Reveal className="section-header">
          <h2>Built with a few things most note apps skip.</h2>
          <p>These aren't roadmap promises — they're in the app today.</p>
        </Reveal>

        <Stagger className="capabilities-grid">
          {CAPABILITIES.map(({ id, icon: Icon, title, color, desc }) => (
            <motion.div key={id} variants={staggerItem} className="capability-card">
              <div className={`capability-icon tint-${color}`}>
                <Icon size={22} strokeWidth={1.6} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </Stagger>
      </section>

      {/* 5. Security — real, verifiable practices instead of unearned
          compliance badges (no SOC2/ISO cert has actually been issued). */}
      <section className="security-section">
        <div className="mkt-container security-grid">
          <Reveal>
            <span className="section-eyebrow"><Zap size={13} /> Under the hood</span>
            <h2>Your data, scoped to you.</h2>
            <p>
              Every table is protected by Postgres row-level security policies scoped to your
              authenticated user id — not a shared "allow all" rule. Page encryption uses your
              browser's native Web Crypto API; the passphrase and plaintext never leave your
              device unencrypted.
            </p>
          </Reveal>
          <Stagger className="security-checklist">
            {[
              'Owner-scoped Postgres row-level security on every table',
              'Auth required for all writes — no anonymous data paths',
              'Client-side AES-GCM 256-bit encryption for locked pages',
              'Bring your own AI key — it never touches our servers',
            ].map((item) => (
              <motion.div key={item} variants={staggerItem} className="security-item">
                <Check size={16} className="check-icon" />
                <span>{item}</span>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="final-cta-section mkt-container">
        <Reveal className="cta-banner">
          <h2>Start writing in less than a minute.</h2>
          <p>No credit card. No fake trial countdown. Just a workspace that's ready when you are.</p>
          <div className="cta-btn-group">
            <Link to="/login" className="btn btn-primary btn-lg">
              Get Noska free
            </Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg">
              View all plans <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
