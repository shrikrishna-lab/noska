import { motion } from 'framer-motion';
import {
  Plug, Sparkles, Calendar, MessageSquare, Code2, Mail, Cloud, Terminal,
} from 'lucide-react';

// Generic, unbranded stand-ins for "connect your tools" — Noska hasn't
// confirmed real integration partners yet, so these represent categories
// of MCP servers (chat, calendar, code hosting, email, cloud storage,
// terminal/CLI tools) rather than specific third-party products.
const ORBIT_ICONS = [
  { icon: MessageSquare, angle: 0 },
  { icon: Calendar, angle: 45 },
  { icon: Code2, angle: 90 },
  { icon: Mail, angle: 135 },
  { icon: Cloud, angle: 180 },
  { icon: Terminal, angle: 225 },
  { icon: Sparkles, angle: 270 },
  { icon: Plug, angle: 315 },
];

const RADIUS = 168;

function OrbitNode({ icon: Icon, angle, index }) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * RADIUS;
  const y = Math.sin(rad) * RADIUS;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 46,
        height: 46,
        marginTop: -23,
        marginLeft: -23,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--nl-card)',
        border: '1px solid var(--nl-border)',
        boxShadow: 'var(--nl-shadow-md)',
        color: 'var(--nl-accent-ink)',
      }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, x, y, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}>
        <Icon size={19} strokeWidth={1.7} />
      </motion.div>
    </motion.div>
  );
}

/**
 * MCP integrations showcase — a center "Noska AI" node with tool-category
 * icons orbiting around it, connected by thin animated lines, echoing the
 * "workspace surrounded by connected app icons" pattern from the brief's
 * reference screenshots but built from generic categories instead of real
 * (unconfirmed) brand integrations.
 */
export function IntegrationsOrbit() {
  return (
    <section style={{ padding: '90px 0', position: 'relative', overflow: 'hidden' }}>
      <div className="nl-container">
        <div className="nl-section-header">
          <span className="nl-eyebrow"><Plug size={12} /> MCP Ready</span>
          <h2>Connect the tools you already use.</h2>
          <p>Noska AI speaks Model Context Protocol — plug in external servers so it can reason with context beyond the page.</p>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: 420, margin: '0 auto' }}>
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            viewBox="-210 -210 420 420"
          >
            {ORBIT_ICONS.map(({ angle }, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * RADIUS;
              const y = Math.sin(rad) * RADIUS;
              return (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={x}
                  y2={y}
                  stroke="var(--nl-border-strong)"
                  strokeWidth="1.4"
                  strokeDasharray="4 5"
                />
              );
            })}
          </svg>

          <div style={{ position: 'absolute', inset: 0 }}>
            {ORBIT_ICONS.map((item, i) => (
              <OrbitNode key={i} {...item} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 108,
              height: 108,
              borderRadius: 28,
              background: 'linear-gradient(160deg, var(--nl-accent), var(--nl-accent-ink))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#fff',
              boxShadow: 'var(--nl-shadow-lg)',
              zIndex: 2,
            }}
          >
            <Sparkles size={26} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Noska AI</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
