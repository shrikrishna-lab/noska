import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-triggered fade/rise-in wrapper used across the marketing site.
 * Animates once when the element enters the viewport (never re-triggers on
 * scroll-up), keeping long pages performant. Optional `blur` adds a soft
 * blur-to-sharp reveal on top of the fade/rise.
 */
export function Reveal({ children, delay = 0, y = 24, x = 0, blur = false, className = '', as = 'div' }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x, filter: blur ? 'blur(8px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
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

/**
 * Splits text into words and reveals them one at a time as the block
 * scrolls into view — used for hero/section headlines that want a
 * deliberate, editorial entrance rather than a single fade.
 */
export function WordReveal({ text, className = '', delay = 0, staggerDelay = 0.045 }) {
  const words = text.split(' ');
  return (
    <motion.span
      className={`word-reveal ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ staggerChildren: staggerDelay, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <span className="word-reveal-mask" key={i}>
          <motion.span
            className="word-reveal-word"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              visible: { y: '0%', opacity: 1, transition: { duration: 0.6, ease: EASE } },
            }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
