import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Reveal } from './components/Reveal';
import './Changelog.css';

/**
 * Real changelog entries sourced from the actual feature set shipped in the
 * app (see features_list.md / Noska_Engineering_Handbook at the time these
 * were built) — no placeholder "v2.4.1 - bug fixes" filler.
 */
const ENTRIES = [
  {
    date: 'Latest',
    tag: 'Security',
    title: 'Owner-scoped row-level security across every table',
    desc: 'Every Postgres table now enforces access scoped to the authenticated user via Supabase Auth — replacing the previous open policy. Writes require a real session; there is no anonymous data path.',
  },
  {
    date: 'Recent',
    tag: 'Editor',
    title: 'Page title icon picker & hover block tools',
    desc: 'The page title now has its own emoji picker, drag handle, and inline comment support — matching the interaction model of every other block.',
  },
  {
    date: 'Recent',
    tag: 'Databases',
    title: 'View reordering, renaming, and a fullscreen mode',
    desc: 'Database views can now be dragged into a new order or renamed inline, and any view can expand to fill the screen for focused work.',
  },
  {
    tag: 'Core',
    title: 'Thought Graph view',
    desc: 'Every page in your workspace rendered as a node in a force-directed graph, connected by real parent/child and tag relationships.',
  },
  {
    tag: 'Core',
    title: 'Infinite Canvas mode',
    desc: 'Any page can switch into a zoomable, pannable canvas where blocks become draggable cards with persisted positions.',
  },
  {
    tag: 'AI',
    title: '8 AI providers, bring your own key',
    desc: 'OpenAI, Anthropic, Gemini, Groq, OpenRouter, NVIDIA NIM, and local Ollama/LM Studio for fully offline AI — your key, never routed through us.',
  },
  {
    tag: 'Study',
    title: 'Spaced repetition with the SM-2 algorithm',
    desc: 'Turn any block into a flashcard and review it on the same spacing schedule that powers Anki.',
  },
  {
    tag: 'Security',
    title: 'Client-side page encryption',
    desc: 'Lock any page with AES-GCM 256-bit encryption derived via PBKDF2 — entirely in your browser, using the Web Crypto API.',
  },
];

export default function Changelog() {
  return (
    <div className="changelog-wrapper">
      <section className="changelog-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="changelog-eyebrow"><Sparkles size={13} /> Changelog</span>
          <h1>What's actually shipped.</h1>
          <p>Every entry below is a real, built feature — not a roadmap promise. Roadmap items are called out separately on the Enterprise and Pricing pages.</p>
        </motion.div>
      </section>

      <section className="changelog-list mkt-container">
        {ENTRIES.map((entry, i) => (
          <Reveal key={entry.title} delay={Math.min(i * 0.05, 0.3)} className="changelog-entry">
            <div className="changelog-meta">
              {entry.date && <span className="changelog-date">{entry.date}</span>}
              <span className={`changelog-tag tag-${entry.tag.toLowerCase()}`}>{entry.tag}</span>
            </div>
            <h3>{entry.title}</h3>
            <p>{entry.desc}</p>
          </Reveal>
        ))}
      </section>
    </div>
  );
}
