import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

/**
 * Scroll-triggered fade/rise-in wrapper used across the marketing site.
 * Animates once when the element enters the viewport (never re-triggers on
 * scroll-up), keeping long pages performant.
 */
export function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** Staggers its direct motion children in on scroll — wrap a grid/list with
 * this and give each child a `variants={itemVariants}` (or just rely on the
 * inherited variant via `<Stagger><motion.div/></Stagger>`). */
export function Stagger({ children, className = '', staggerDelay = 0.08 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ staggerChildren: staggerDelay }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
