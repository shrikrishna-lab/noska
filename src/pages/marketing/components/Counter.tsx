import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

/**
 * Animates a number counting up from 0 to `value` once it scrolls into
 * view. Used for the stats strip so figures feel alive rather than static.
 */
export function Counter({ value, suffix = '', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20, mass: 1 });
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

  useEffect(() => {
    if (inView) motionValue.set(numericValue);
  }, [inView, numericValue, motionValue]);

  useEffect(() => {
    const unsub = spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.round(latest)}${suffix}`;
      }
    });
    return unsub;
  }, [spring, suffix]);

  return (
    <motion.span ref={ref} className={className}>
      0{suffix}
    </motion.span>
  );
}
