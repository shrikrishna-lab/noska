import { motion } from 'framer-motion';

/**
 * A frosted-glass card surface for showcasing a UI mockup with depth —
 * translucent background, blur, soft border highlight, and a gentle
 * lift-on-hover. Native reimplementation of the referenced Framer
 * "Glass-Showcase" component (Framer canvas-only, can't be imported into
 * a standalone app). Kept subtle (light blur, low-opacity tint) to match
 * the marketing site's paper/editorial theme rather than a heavy
 * glassmorphism look.
 */
export function GlassShowcase({ children, className = '' }) {
  return (
    <motion.div
      className={`mkt-glass-showcase ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
    >
      <div className="mkt-glass-showcase-inner">{children}</div>
    </motion.div>
  );
}
