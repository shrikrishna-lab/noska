import { motion } from 'framer-motion';

/**
 * Very subtle, slow-drifting blurred color fields for hero depth — a
 * native reimplementation of the referenced Framer "AnimatedLiquidBackground"
 * component (Framer canvas-only, can't be imported directly). Sits behind
 * the existing .mkt-blobs dot-grid/radial-glow layer in the hero, at low
 * opacity so it reads as "almost invisible" per the brief rather than a
 * loud gradient-mesh effect.
 */
export function LiquidBackground() {
  return (
    <div className="mkt-liquid-bg" aria-hidden="true">
      <motion.div
        className="mkt-liquid-blob lb1"
        animate={{ x: [0, 26, -8, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="mkt-liquid-blob lb2"
        animate={{ x: [0, -20, 12, 0], y: [0, 14, -16, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="mkt-liquid-blob lb3"
        animate={{ x: [0, 16, -18, 0], y: [0, -12, 10, 0] }}
        transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
