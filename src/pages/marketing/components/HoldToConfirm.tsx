import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

/**
 * Zero-style press-and-hold gate. The user must HOLD to complete a
 * consequential action — progress fills under the pointer, and on
 * completion the fill color SNAPS back (~200ms) exactly like the reference
 * site's shatter moment: "a longer 400ms transition felt noticeably less
 * impactful." Cancelling eases back gently instead.
 *
 * Used where marketing pages demonstrate destructive/consequential flows:
 * hold-to-revoke (plugins), hold-to-boot (MCP), hold-to-rotate (API keys).
 */
export function HoldToConfirm({
  label = 'Hold to confirm',
  doneLabel = 'Done',
  duration = 900,
  onComplete,
  accent = 'currentColor',
  className = '',
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);
  const holding = useRef(false);

  const tick = (t) => {
    if (!holding.current) return;
    const p = Math.min(1, (t - start.current) / duration);
    setProgress(p);
    if (p >= 1) {
      holding.current = false;
      setDone(true);
      // The snap-back: completion flashes, then releases in ~200ms.
      setTimeout(() => setProgress(0), 200);
      onComplete?.();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (done) return;
    holding.current = true;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  const cancel = () => {
    holding.current = false;
    cancelAnimationFrame(raf.current);
    setProgress(0); // gentle ease handled by CSS transition
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const scale = useSpring(1, { stiffness: 300, damping: 20 });

  return (
    <motion.button
      type="button"
      className={`hold-btn ${className}`}
      style={{ scale }}
      onPointerDown={(e) => { e.preventDefault(); scale.set(0.97); begin(); }}
      onPointerUp={() => { scale.set(1); cancel(); }}
      onPointerLeave={() => { scale.set(1); cancel(); }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={done ? doneLabel : label}
      data-done={done || undefined}
    >
      <span className="hold-btn-track" aria-hidden>
        <span
          className="hold-btn-fill"
          style={{ width: `${progress * 100}%`, background: accent, transition: holding.current ? 'none' : 'width .25s ease' }}
        />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? 'done' : 'idle'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="hold-btn-label"
        >
          {done ? doneLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
