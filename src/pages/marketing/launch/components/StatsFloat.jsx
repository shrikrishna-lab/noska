import { motion } from 'framer-motion';
import {
  FileText, Table2, Sparkles, Database, CalendarDays, GitBranch, Lock, Mic,
} from 'lucide-react';

// Numbers match the counts already used elsewhere in the app's own
// marketing copy (src/pages/marketing/Home.jsx STATS) — real block/view/
// provider counts shipped in the product, not placeholder growth metrics.
const FLOATERS = [
  { icon: FileText, tint: 'var(--nl-accent)', top: '6%', left: '8%', delay: 0 },
  { icon: Table2, tint: 'var(--nl-success)', top: '14%', left: '85%', delay: 0.4 },
  { icon: Sparkles, tint: 'var(--nl-accent)', top: '78%', left: '6%', delay: 0.8 },
  { icon: Database, tint: 'var(--nl-success)', top: '82%', left: '88%', delay: 1.2 },
  { icon: CalendarDays, tint: 'var(--nl-accent)', top: '40%', left: '2%', delay: 0.2 },
  { icon: GitBranch, tint: 'var(--nl-success)', top: '10%', left: '46%', delay: 0.6 },
  { icon: Lock, tint: 'var(--nl-accent)', top: '86%', left: '46%', delay: 1.0 },
  { icon: Mic, tint: 'var(--nl-success)', top: '44%', left: '93%', delay: 1.4 },
];

/**
 * Large centered stat statement with capability icons drifting at the
 * edges of the section — the "growing library" visual pattern (big number
 * copy + scattered floating app icons) reimplemented with generic
 * capability icons instead of third-party brand marks, since Noska is
 * pre-launch and has no confirmed integration partners to display yet.
 */
export function StatsFloat() {
  return (
    <section style={{ position: 'relative', padding: '110px 0', overflow: 'hidden' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {FLOATERS.map(({ icon: Icon, tint, top, left, delay }, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              top,
              left,
              width: 44,
              height: 44,
              borderRadius: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--nl-card)',
              border: '1px solid var(--nl-border)',
              boxShadow: 'var(--nl-shadow-sm)',
              color: tint,
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay }}
          >
            <Icon size={18} strokeWidth={1.7} />
          </motion.div>
        ))}
      </div>

      <div className="nl-container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--nl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 18 }}
        >
          A workspace built with
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ fontSize: 44, lineHeight: 1.3, maxWidth: 640, margin: '0 auto' }}
        >
          33 block types, 8 database views,
          <br />
          and 8 AI providers to choose from.
        </motion.h2>
      </div>
    </section>
  );
}
