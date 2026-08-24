import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Cursor-following protagonist — the marketing-site homage to Zero's green
 * hand. A small shape trails the pointer with spring physics; each page
 * gives it a different identity so every surface has its own "character":
 *
 *   plugins  → a plug glyph      (things connect)
 *   mcp      → a terminal block  (the caret is you)
 *   apikeys  → a crosshair       (scoped precision)
 *
 * Hidden on touch devices and when the user prefers reduced motion.
 */
export function CursorFollower({ variant = 'dot', label }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 350, damping: 30, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 350, damping: 30, mass: 0.6 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;
    setEnabled(true);
    const move = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div className={`cursor-follower cursor-${variant}`} aria-hidden style={{ x: sx, y: sy }}>
      <span className="cursor-shape">
        {variant === 'mcp' && <span className="cursor-caret" />}
        {variant === 'apikeys' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        )}
        {variant === 'plugins' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0V7ZM12 17v4" />
          </svg>
        )}
      </span>
      {label && <span className="cursor-tag">{label}</span>}
    </motion.div>
  );
}
