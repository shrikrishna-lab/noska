import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Wraps any element (typically a CTA button) so it drifts slightly toward
 * the cursor while hovered — a subtle "magnetic" pull, not a full-travel
 * follow. Respects prefers-reduced-motion by leaving transforms at rest
 * (handled globally via the CSS media query disabling transitions/animations).
 */
export function Magnetic({ children, strength = 0.25, className = '' }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 18, mass: 0.4 });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`magnetic-wrap ${className}`}
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}
