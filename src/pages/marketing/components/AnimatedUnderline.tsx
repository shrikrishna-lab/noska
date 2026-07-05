import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Wraps a nav label with a thin SVG line that draws in from the left on
 * hover/active and retracts on leave — a native reimplementation of the
 * referenced Framer "AnimatedSVGUnderline" component (Framer canvas-only,
 * can't be imported into a standalone app).
 */
export function AnimatedUnderline({ children, active = false, className = '' }) {
  const [hovered, setHovered] = useState(false);
  const show = active || hovered;

  return (
    <span
      className={`mkt-underline-wrap ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <svg className="mkt-underline-svg" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
        <motion.path
          d="M0 2 H100"
          initial={false}
          animate={{ pathLength: show ? 1 : 0, opacity: show ? 1 : 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </span>
  );
}
