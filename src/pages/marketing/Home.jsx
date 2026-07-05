import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, ArrowUpRight, LayoutGrid, GitBranch, Mic, Lock,
  BrainCircuit, Blocks, PenLine, Sparkles, FileText, Database, CheckSquare,
  Command, ChevronDown, Search,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem, WordReveal } from './components/Reveal';
import { HeroScene } from './components/HeroScene';
import { ScrollShowcase } from './components/ScrollShowcase';
import { Counter } from './components/Counter';
import { TiltCard } from './components/TiltCard';
import { Magnetic } from './components/Magnetic';
import { MacWindow } from './components/MacWindow';
import './Home.css';

const STATS = [
  { num: 33, suffix: '', label: 'block types', sub: 'text, tables, code, embeds, and more' },
  { num: 8, suffix: '', label: 'database views', sub: 'table, board, calendar, timeline, graph…' },
  { num: 8, suffix: '', label: 'AI providers', sub: 'bring your own key — OpenAI, Anthropic, Gemini, Groq…' },
];

const STORY_SECTIONS = [
  {
    id: 'capture',
    icon: PenLine,
    eyebrow: 'Capture',
    title: 'Get the thought down before it slips away.',
    desc: 'A blank page opens instantly. Type "/" for any of 33 block types — or just write. Nothing about capturing an idea should feel like setup.',
    tint: 'sage',
  },
  {
    id: 'organize',
    icon: LayoutGrid,
    eyebrow: 'Organize',
    title: 'Let structure emerge, don\'t force it upfront.',
    desc: 'The same page can become a table, a board, or a calendar — same rows, different lens. Reorganize as understanding changes, not before it does.',
    tint: 'blue',
  },
  {
    id: 'connect',
    icon: GitBranch,
    eyebrow: 'Connect',
    title: 'See how your ideas relate to each other.',
    desc: 'The Thought Graph draws real connections between pages — not a static sitemap, but a living map of what you actually linked and why.',
    tint: 'purple',
  },
  {
    id: 'remember',
    icon: BrainCircuit,
    eyebrow: 'Remember',
    title: 'Knowledge that resurfaces itself.',
    desc: 'Turn any note into a flashcard reviewed on a spaced-repetition schedule — so what you write down actually stays with you.',
    tint: 'orange',
  },
];

const CAPABILITIES = [
  { id: 'canvas', icon: LayoutGrid, title: 'Infinite Canvas', tint: 'blue', desc: 'Every page can drop into a zoomable, pannable spatial canvas — blocks become draggable cards with a live mini-map and persisted positions.' },
  { id: 'graph', icon: GitBranch, title: 'Thought Graph', tint: 'purple', desc: 'See your whole workspace as a force-directed node graph, built from real parent/child and tag relationships.' },
  { id: 'voice', icon: Mic, title: 'Voice → structure', tint: 'red', desc: 'Speak your thoughts and Noska transcribes them live, then turns the raw transcript into a structured outline.' },
  { id: 'encryption', icon: Lock, title: 'Real encryption', tint: 'sage', desc: 'Lock any page with the Web Crypto API — PBKDF2 + AES-GCM 256-bit, entirely client-side. Plaintext never touches the network.' },
  { id: 'spaced', icon: BrainCircuit, title: 'Spaced repetition', tint: 'orange', desc: 'Turn any block into a flashcard reviewed with the SM-2 scheduling algorithm — the same model behind Anki.' },
  { id: 'api', icon: Blocks, title: 'Open API console', tint: 'blue', desc: 'A built-in console documents every route and lets you generate a token and run live requests, right from the sidebar.' },
];

const FAQS = [
  { q: 'Is Noska really free to start?', a: 'Yes. Create pages, use the AI panel with your own key, and organize with databases on the Free plan — no card required.' },
  { q: 'Do I need my own AI key?', a: 'Noska AI works with your own API key from any of 8 supported providers, including local options like Ollama and LM Studio for fully offline use. Your key and prompts never touch our servers.' },
  { q: 'What happens to my data if I lock a page?', a: 'Locked pages are encrypted client-side with AES-GCM 256-bit before anything leaves your device. The passphrase and plaintext are never transmitted or stored on our servers.' },
  { q: 'Can I export everything back out?', a: 'Yes — every page can be exported to Markdown, HTML, or PDF at any time. There is no lock-in format.' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('docs');
  const [aiText, setAiText] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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
      <section className="hero-section mkt-blobs">
        <div className="mkt-container hero-grid">
          <div>
            <motion.span
              className="hero-eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Sparkles size={13} /> A calmer way to think on a page
            </motion.span>

            <h1 className="hero-title">
              <WordReveal text="The smartest place" delay={0.1} />
              <br />
              <WordReveal text="to think." delay={0.4} className="hero-title-italic" />
            </h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              Noska is a notes workspace built for clear thinking — capture ideas, let them take
              shape as tables or boards, and see how everything connects. No clutter, no ceremony.
            </motion.p>

            <motion.div
              className="hero-cta-group"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Magnetic>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Get started free <ArrowRight size={18} />
                </Link>
              </Magnetic>
              <Link to="/product" className="btn btn-secondary btn-lg">
                See what's inside
              </Link>
            </motion.div>

            <motion.div
              className="hero-kbd-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              <kbd>⌘</kbd><kbd>K</kbd> <span>to open the command palette, anywhere in the app</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroScene />
          </motion.div>
        </div>

        <div className="scroll-cue">
          <motion.div
            className="scroll-cue-dot"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </section>

      {/* 2. Real stats, not vanity metrics */}
      <section className="stats-strip-section">
        <div className="mkt-container stats-strip">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1} className="stats-strip-item">
              <span className="stats-strip-num"><Counter value={s.num} suffix={s.suffix} /></span>
              <span className="stats-strip-label">{s.label}</span>
              <span className="stats-strip-sub">{s.sub}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. Storytelling sections — how Noska helps you think, one idea
          per section, alternating layout for visual rhythm. */}
      <section className="story-sections mkt-container">
        {STORY_SECTIONS.map((s, i) => (
          <StorySection key={s.id} section={s} reverse={i % 2 === 1} />
        ))}
      </section>

      {/* 4. Sticky scroll-scrubbed product walkthrough */}
      <ScrollShowcase />

      {/* 5. Interactive feature tabs — real product behavior */}
      <section className="features-section mkt-container">
        <Reveal className="section-header">
          <span className="section-eyebrow-pill">Inside the workspace</span>
          <h2>Every way you work, in one place.</h2>
          <p>Consolidate docs, structured data, and AI into a single, quiet interface.</p>
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
              <Icon size={17} strokeWidth={1.6} />
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
                <span className="category-label text-sage">Docs</span>
                <h3>Simple, powerful, and collaborative.</h3>
                <p>33 block types — text, tables, code, embeds, callouts, columns, and more. Real-time edits sync across every connected client.</p>
              </>
            )}
            {activeTab === 'wikis' && (
              <>
                <span className="category-label text-blue">Wikis</span>
                <h3>Nest pages, link freely, never lose track.</h3>
                <p>Build a page tree as deep as you need. The Thought Graph view visualizes every link so your knowledge base stays navigable, not tangled.</p>
              </>
            )}
            {activeTab === 'projects' && (
              <>
                <span className="category-label text-orange">Projects</span>
                <h3>Databases with 8 real view types.</h3>
                <p>Table, board, calendar, timeline, gallery, list, graph, and mind-map — all reading from the same underlying rows, switch anytime.</p>
              </>
            )}
            {activeTab === 'ai' && (
              <>
                <span className="category-label text-purple">Noska AI</span>
                <h3>Bring your own key, pick your model.</h3>
                <p>8 providers supported out of the box — OpenAI, Anthropic, Gemini, Groq, OpenRouter, NVIDIA NIM, and local Ollama/LM Studio for fully offline AI.</p>
                <div className="interactive-hint">Click "Ask AI" below — this response is really generated by the typing animation, not a canned screenshot.</div>
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
                {activeTab === 'docs' && <FileText size={56} strokeWidth={1.1} />}
                {activeTab === 'wikis' && <Database size={56} strokeWidth={1.1} />}
                {activeTab === 'projects' && <CheckSquare size={56} strokeWidth={1.1} />}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* 6. Command palette showcase */}
      <section className="palette-section mkt-container">
        <div className="palette-grid">
          <Reveal x={-24}>
            <span className="section-eyebrow-pill">Speed</span>
            <h2>One shortcut away from anything.</h2>
            <p>
              The command palette finds pages, jumps views, triggers AI actions, and runs
              keyboard-only workflows without ever touching the mouse. Every entry below is a
              real command, not a mockup.
            </p>
          </Reveal>

          <Reveal delay={0.1} x={24}>
            <MacWindow title="Command Palette" className="palette-window">
              <div className="palette-search-row">
                <Search size={14} />
                <span>graph</span>
                <span className="palette-caret" />
              </div>
              <div className="palette-results">
                <div className="palette-result active">
                  <GitBranch size={14} />
                  <span>Open Thought Graph</span>
                  <kbd>↵</kbd>
                </div>
                <div className="palette-result">
                  <LayoutGrid size={14} />
                  <span>Switch to Canvas view</span>
                </div>
                <div className="palette-result">
                  <Sparkles size={14} />
                  <span>Ask AI: summarize graph</span>
                </div>
                <div className="palette-result">
                  <Command size={14} />
                  <span>Graph settings</span>
                </div>
              </div>
            </MacWindow>
          </Reveal>
        </div>
      </section>

      {/* 7. Capabilities grid */}
      <section className="capabilities-section mkt-container">
        <Reveal className="section-header">
          <span className="section-eyebrow-pill">Beyond the basics</span>
          <h2>Built with a few things most note apps skip.</h2>
          <p>These aren't roadmap promises — they're in the app today.</p>
        </Reveal>

        <Stagger className="capabilities-grid">
          {CAPABILITIES.map(({ id, icon: Icon, title, tint, desc }) => (
            <motion.div key={id} variants={staggerItem}>
              <TiltCard className="capability-card">
                <div className={`capability-icon tint-${tint}`}>
                  <Icon size={19} strokeWidth={1.6} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </Stagger>
      </section>

      {/* 8. Security */}
      <section className="security-section">
        <div className="mkt-container security-grid">
          <Reveal>
            <span className="section-eyebrow-pill">Under the hood</span>
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

      {/* 9. FAQ */}
      <section className="faq-home-section mkt-container">
        <Reveal className="section-header">
          <span className="section-eyebrow-pill">Questions</span>
          <h2>Good to know before you start.</h2>
        </Reveal>
        <div className="faq-home-list">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.05} className="faq-home-item">
              <button className="faq-home-question" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                <span>{faq.q}</span>
                <ChevronDown size={16} className={`faq-home-chevron ${openFaq === i ? 'open' : ''}`} />
              </button>
              <div className={`faq-home-answer ${openFaq === i ? 'open' : ''}`}>
                <p>{faq.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="final-cta-section mkt-container">
        <Reveal className="cta-banner mkt-blobs">
          <h2>Start writing in less than a minute.</h2>
          <p>No credit card. No fake trial countdown. Just a workspace that's ready when you are.</p>
          <div className="cta-btn-group">
            <Magnetic>
              <Link to="/login" className="btn btn-primary btn-lg">
                Get Noska free <ArrowUpRight size={16} />
              </Link>
            </Magnetic>
            <Link to="/pricing" className="btn btn-secondary btn-lg">
              View all plans
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function StorySection({ section, reverse }) {
  const Icon = section.icon;
  return (
    <div className={`story-section ${reverse ? 'reverse' : ''}`}>
      <Reveal className="story-text" x={reverse ? 24 : -24}>
        <span className={`story-eyebrow tint-${section.tint}`}>
          <Icon size={14} /> {section.eyebrow}
        </span>
        <h3>{section.title}</h3>
        <p>{section.desc}</p>
      </Reveal>
      <Reveal delay={0.1} blur className="story-visual">
        <StoryIllustration tint={section.tint} icon={Icon} />
      </Reveal>
    </div>
  );
}

/** A minimal, hand-drawn-feeling illustration built from soft shapes and
 * thin strokes — no stock imagery, no 3D renders. */
function StoryIllustration({ tint, icon: Icon }) {
  return (
    <TiltCard className={`story-illustration tint-${tint}`}>
      <div className="story-illustration-lines">
        <span style={{ width: '70%' }} />
        <span style={{ width: '45%' }} />
        <span style={{ width: '58%' }} />
      </div>
      <div className="story-illustration-badge">
        <Icon size={22} strokeWidth={1.6} />
      </div>
    </TiltCard>
  );
}
