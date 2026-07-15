import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * A "paint stroke" text reveal: the phrase sits pre-rendered in a muted
 * tone, then a mask sweeps left-to-right once in view, brushing it into
 * full ink color — approximating the Framer "PaintReveal" component with a
 * plain background-clip animation.
 */
export function PaintReveal({ text, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <p ref={ref} className={`nl-paint-reveal ${className}`}>
      <motion.span
        className="nl-paint-reveal-mask"
        initial={{ backgroundSize: '0% 100%' }}
        animate={inView ? { backgroundSize: '100% 100%' } : {}}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </p>
  );
}
