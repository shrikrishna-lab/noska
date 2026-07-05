import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * A "paint stroke" text reveal: the phrase sits muted, then a mask sweeps
 * left-to-right once in view, brushing it into full ink color. Native
 * reimplementation of the referenced Framer "PaintReveal" component.
 */
export function PaintReveal({ text, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <p ref={ref} className={`mkt-paint-reveal ${className}`}>
      <motion.span
        className="mkt-paint-reveal-mask"
        initial={{ backgroundSize: '0% 100%' }}
        animate={inView ? { backgroundSize: '100% 100%' } : {}}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </p>
  );
}
