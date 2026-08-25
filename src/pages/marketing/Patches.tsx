import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import {
  Sparkles, Plus, Wrench, Bug, AlertCircle, FileText,
  ArrowUp, Link2, Check, Rocket,
} from 'lucide-react';
import { Reveal, WordReveal } from './components/Reveal';
import { supabaseAnon } from '../../lib/supabase';
import './Patches.css';

interface PatchNote {
  id: string;
  version: string | null;
  title: string;
  summary: string | null;
  features: string[];
  improvements: string[];
  fixes: string[];
  known_issues: string[];
  published_at: string | null;
}

type FilterKey = 'all' | 'features' | 'improvements' | 'fixes' | 'known_issues';

const EASE = [0.16, 1, 0.3, 1] as const;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

const SECTIONS = [
  { key: 'features' as const, label: 'New Features', icon: Plus, className: 'features' },
  { key: 'improvements' as const, label: 'Improvements', icon: Wrench, className: 'improvements' },
  { key: 'fixes' as const, label: 'Bug Fixes', icon: Bug, className: 'fixes' },
  { key: 'known_issues' as const, label: 'Known Issues', icon: AlertCircle, className: 'known' },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Everything' },
  ...SECTIONS.map((s) => ({ key: s.key as FilterKey, label: s.label })),
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

/** eased count-up; snaps instantly when the user prefers reduced motion */
function useCountUp(target: number, start: boolean, duration = 900): number {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration, reduced]);
  return value;
}

function PatchCard({
  note,
  index,
  filter,
}: {
  note: PatchNote;
  index: number;
  filter: FilterKey;
}) {
  const [copied, setCopied] = useState(false);
  const latest = index === 0;

  const sections = useMemo(
    () => (filter === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === filter)),
    [filter]
  );

  // In a filtered view, hide cards that have nothing to show
  if (filter !== 'all') {
    const active = sections.find((s) => (note[s.key]?.length ?? 0) > 0);
    if (!active) return null;
  }

  const date = note.published_at
    ? new Date(note.published_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const slug = note.version ? `v${note.version.replace(/^v/, '').replace(/\./g, '-')}` : note.id.slice(0, 8);

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Reveal delay={Math.min(index * 0.05, 0.15)} y={28} className="patch-card-wrap">
      <article id={slug} className={`patch-card ${latest ? 'latest' : ''}`}>
        {latest && (
          <span className="patch-latest-badge">
            <Rocket size={11} />
            <span>Latest</span>
          </span>
        )}

        <header className="patch-card-header">
          <div className="patch-meta">
            <span className="patch-version">{note.version ? `v${note.version.replace(/^v/, '')}` : 'Update'}</span>
            {date && <span className="patch-date">{date}</span>}
            <button
              type="button"
              className={`patch-copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyLink}
              aria-label={copied ? 'Link copied' : 'Copy link to this update'}
              title="Copy link"
            >
              {copied ? <Check size={12} /> : <Link2 size={12} />}
              <span>{copied ? 'Copied' : 'Link'}</span>
            </button>
          </div>
          <h2>{note.title}</h2>
          {note.summary && <p className="patch-summary">{note.summary}</p>}
        </header>

        <div className="patch-sections">
          {sections.map((s, i) => {
            const items = note[s.key];
            if (!items?.length) return null;
            const Icon = s.icon;
            return (
              <motion.section
                key={s.key}
                className={`patch-section ${s.className}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.07, 0.21), ease: EASE }}
              >
                <h3>
                  <motion.span
                    className="patch-section-icon"
                    initial={{ scale: 0.5, rotate: -14 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 20, delay: Math.min(i * 0.07, 0.21) + 0.1 }}
                  >
                    <Icon size={13} />
                  </motion.span>
                  <span>{s.label}</span>
                  <motion.span
                    className="patch-count"
                    initial={{ scale: 0.4, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22, delay: Math.min(i * 0.07, 0.21) + 0.18 }}
                  >
                    {items.length}
                  </motion.span>
                </h3>
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-30px' }}
                >
                  {items.map((item, j) => (
                    <motion.li key={j} variants={itemVariants}>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.section>
            );
          })}
        </div>
      </article>
    </Reveal>
  );
}

function SkeletonCard() {
  return (
    <div className="patch-card patch-skeleton" aria-hidden="true">
      <header className="patch-card-header">
        <div className="skel skel-pill" />
        <div className="skel skel-title" />
        <div className="skel skel-line" />
      </header>
      <div className="patch-sections">
        {[0, 1].map((i) => (
          <div key={i} className="patch-section">
            <div className="skel skel-heading" />
            <div className="skel skel-line" />
            <div className="skel skel-line short" />
            <div className="skel skel-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Patches() {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showTop, setShowTop] = useState(false);
  const [heroSeen, setHeroSeen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Scroll progress — the marketing layout scrolls inside the .marketing
  // Lenis wrapper, not the window, so hand its ref to framer's useScroll.
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    scrollContainerRef.current = document.querySelector('.marketing');
  }, []);
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const { data, error: err } = await (supabaseAnon as any)
        .from('patch_notes')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        console.error('Failed to fetch patch notes:', err);
        setError('Patch notes are unavailable right now.');
      } else {
        setNotes(
          (data ?? []).map((n: any) => ({
            ...n,
            features: asStringArray(n.features),
            improvements: asStringArray(n.improvements),
            fixes: asStringArray(n.fixes),
            known_issues: asStringArray(n.known_issues),
          }))
        );
      }
      setLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const container = document.querySelector('.marketing');
    if (!container) return;
    const onScroll = () => setShowTop(container.scrollTop > 700);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // trigger hero stat count-ups shortly after mount
    const t = setTimeout(() => setHeroSeen(true), 350);
    return () => clearTimeout(t);
  }, []);

  const totals = useMemo(() => {
    const t = { features: 0, improvements: 0, fixes: 0 };
    for (const n of notes) {
      t.features += n.features.length;
      t.improvements += n.improvements.length;
      t.fixes += n.fixes.length;
    }
    return t;
  }, [notes]);

  const visibleNotes = useMemo(
    () =>
      filter === 'all'
        ? notes
        : notes.filter((n) => SECTIONS.some((s) => (n[s.key]?.length ?? 0) > 0)),
    [filter, notes]
  );

  const fCount = useCountUp(totals.features, heroSeen && !loading);
  const iCount = useCountUp(totals.improvements, heroSeen && !loading);
  const xCount = useCountUp(totals.fixes, heroSeen && !loading);

  const stats = [
    { value: fCount, label: `Feature${fCount === 1 ? '' : 's'} added` },
    { value: iCount, label: `Improvement${iCount === 1 ? '' : 's'}` },
    { value: xCount, label: `Fix${xCount === 1 ? '' : 'es'} shipped` },
  ];

  const scrollToTop = () => {
    const container = document.querySelector('.marketing');
    if (container) container.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="patches-wrapper">
      {/* ── Scroll progress ── */}
      {!reducedMotion && (
        <motion.div
          className="patches-progress"
          style={{ scaleX: progress }}
          aria-hidden="true"
        />
      )}

      {/* ── Hero ── */}
      <section className="patches-hero mkt-container">
        <div className="patches-aurora" aria-hidden="true">
          <span className="aurora a1" />
          <span className="aurora a2" />
          {!reducedMotion && (
            <>
              <span className="float-dot d1" />
              <span className="float-dot d2" />
              <span className="float-dot d3" />
            </>
          )}
        </div>

        <motion.div
          className="patches-hero-inner"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <motion.span
            className="patches-eyebrow"
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            <Sparkles size={13} />
            Updates &amp; Patches
          </motion.span>

          <h1>
            {reducedMotion ? (
              <>Every change, <em>in detail.</em></>
            ) : (
              <>
                <WordReveal text="Every change," staggerDelay={0.05} />
                <motion.em
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
                >
                  {' '}in detail.
                </motion.em>
              </>
            )}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
          >
            Full patch notes for every Noska update — what&rsquo;s new, what&rsquo;s better,
            and what got fixed. Curated by the team, read-only by design.
          </motion.p>

          {!loading && notes.length > 0 && (
            <div className="patches-stats">
              {stats.map((s, i) => (
                <div className="stat-row" key={s.label}>
                  {i > 0 && <span className="stat-divider" />}
                  <motion.div
                    className="stat"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.65 + i * 0.1, ease: EASE }}
                  >
                    <motion.strong
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.7 + i * 0.1 }}
                    >
                      {s.value}
                    </motion.strong>
                    <span>{s.label}</span>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Sticky filters ── */}
      <div className="patches-filterbar">
        <div className="patches-filters mkt-container" role="tablist" aria-label="Filter updates">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {filter === f.key && !reducedMotion && (
                <motion.span
                  layoutId="patch-pill-active"
                  className="filter-pill-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="filter-pill-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      <section className="patches-list mkt-container">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <p className="patches-empty">{error}</p>
        ) : notes.length === 0 ? (
          <div className="patches-empty">
            <FileText size={28} />
            <p>No patch notes yet — check back after the next release.</p>
          </div>
        ) : (
          <div className="patches-timeline">
            {/* rail draws itself in on first view */}
            {!reducedMotion && (
              <motion.span
                className="patches-rail"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.1, ease: EASE }}
                aria-hidden="true"
              />
            )}
            <AnimatePresence initial={false}>
              {visibleNotes.map((note, i) => (
                <PatchCard key={note.id} note={note} index={i} filter={filter} />
              ))}
            </AnimatePresence>
            {visibleNotes.length === 0 && (
              <div className="patches-empty">
                <FileText size={28} />
                <p>Nothing matches this filter yet.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            className="patches-top-btn"
            onClick={scrollToTop}
            aria-label="Back to top"
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.92 }}
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
