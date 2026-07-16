import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Reveal } from './components/Reveal';
import { supabase } from '../../lib/supabase';
import './Changelog.css';

interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  version: string | null;
  published_at: string | null;
  created_at: string;
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('changelog_entries')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch changelog:', error);
      } else {
        setEntries(data ?? []);
      }
      setLoading(false);
    }
    fetch();
  }, []);

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
          <p>Every entry below is a real, built feature — not a roadmap promise.</p>
        </motion.div>
      </section>

      <section className="changelog-list mkt-container">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No changelog entries yet.</p>
        ) : (
          entries.map((entry, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={entry.id} delay={Math.min(i * 0.05, 0.3)} className={`changelog-entry ${isOpen ? 'open' : ''}`}>
                <button className="changelog-entry-header" onClick={() => setOpenIndex(isOpen ? -1 : i)}>
                  <div className="changelog-entry-header-text">
                    <div className="changelog-meta">
                      {entry.published_at && <span className="changelog-date">{new Date(entry.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      <span className={`changelog-tag tag-${entry.tag?.toLowerCase()}`}>{entry.tag}</span>
                      {entry.version && <span className="changelog-version">{entry.version}</span>}
                    </div>
                    <h3>{entry.title}</h3>
                  </div>
                  <ChevronDown size={16} className={`changelog-chevron ${isOpen ? 'open' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="changelog-entry-body"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p>{entry.description}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })
        )}
      </section>
    </div>
  );
}
