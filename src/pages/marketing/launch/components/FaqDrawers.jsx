import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  { q: 'What is Noska?', a: 'Noska is an AI-powered collaborative workspace that combines documents, wikis, projects, databases, notes, and team collaboration into one place — with AI woven through every part of it.' },
  { q: 'How is it different from Notion?', a: 'Noska is built AI-first: writing assistance, AI search, and automation are core to the editor rather than bolted on. It also ships with native MCP integrations for connecting external tools and context.' },
  { q: 'Does it support AI?', a: 'Yes. An AI assistant is built into every page — drafting, expanding, summarizing, and answering questions across your entire workspace.' },
  { q: 'Can I import my notes?', a: 'Yes. You\'ll be able to import from Notion, Markdown files, and plain text when Noska launches, so switching over doesn\'t mean starting from zero.' },
  { q: 'Can I collaborate with my team?', a: 'Yes. Real-time editing, presence, and comments are built in from day one — pages are meant to be worked on together, not just written alone.' },
  { q: 'Does Noska support databases?', a: 'Yes. Structured databases with multiple views — table, board, calendar, and more — all reading from the same underlying rows.' },
  { q: 'What are MCP integrations?', a: 'MCP (Model Context Protocol) lets you connect external developer tools and data sources directly into Noska AI, so it can reason with context beyond just what\'s written on the page.' },
  { q: 'Will there be a free plan?', a: 'Yes. Noska will launch with a free plan so anyone can start a workspace without a credit card.' },
];

/**
 * Expandable drawer list — one open at a time, animated height via
 * framer-motion rather than a CSS max-height hack, matching the Framer
 * "Expandable Drawers" component's smooth, spring-free reveal.
 */
export function FaqDrawers() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="nl-faq nl-container">
      <div className="nl-section-header">
        <span className="nl-eyebrow"><HelpCircle size={12} /> Questions</span>
        <h2>Good to know before you join.</h2>
      </div>

      <div className="nl-faq-list">
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={faq.q} className={`nl-faq-item ${isOpen ? 'open' : ''}`}>
              <button className="nl-faq-question" onClick={() => setOpenIndex(isOpen ? -1 : i)}>
                <span>{faq.q}</span>
                <ChevronDown size={16} className={`nl-faq-chevron ${isOpen ? 'open' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="nl-faq-answer-wrap"
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
