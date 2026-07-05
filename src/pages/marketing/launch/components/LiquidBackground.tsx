import { motion } from 'framer-motion';

/**
 * Very subtle, slow-drifting blurred color fields behind the hero — creates
 * depth without ever reading as a "gradient mesh" effect. Three blobs drift
 * independently on long, gentle loops. Kept at low opacity per the brief
 * ("almost invisible").
 */
export function LiquidBackground() {
  return (
    <div className="nl-liquid-bg" aria-hidden="true">
      <motion.div
        className="nl-liquid-blob b1"
        animate={{ x: [0, 30, -10, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="nl-liquid-blob b2"
        animate={{ x: [0, -24, 14, 0], y: [0, 16, -18, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="nl-liquid-blob b3"
        animate={{ x: [0, 18, -22, 0], y: [0, -14, 12, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
