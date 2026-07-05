import { motion } from 'framer-motion';

/**
 * A small animated checkmark-in-a-circle — the circle draws in, then the
 * check strokes in after. Used as a lightweight "task complete" moment
 * (e.g. after submitting a form). This substitutes for the referenced
 * Framer "Better-Lottie" component: rather than pull in a Lottie player
 * runtime + a .json animation asset for one micro-interaction, the same
 * visual is reproduced natively with an animated SVG path, which is
 * lighter and needs no extra dependency or asset file.
 */
export function SuccessCheck({ size = 56 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="var(--mkt-accent-sage)"
        strokeWidth="2.5"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
        }}
      />
      <motion.path
        d="M14 27 L22 35 L38 17"
        fill="none"
        stroke="var(--mkt-accent-sage)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] } },
        }}
      />
    </motion.svg>
  );
}
