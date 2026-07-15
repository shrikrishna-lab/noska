import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const LINES = [
  { text: 'Ideas become knowledge.' },
  { text: 'Knowledge becomes action.' },
  { text: 'Your workspace should think with you.', accent: 'think with you' },
  { text: 'Everything connected.' },
  { text: 'Built for modern teams.' },
];

/**
 * Each line fades from muted to full ink color as it crosses the vertical
 * center of the viewport, then fades back out — a native recreation of the
 * Framer "ScrollFadeText" component using per-line scroll progress.
 */
export function ScrollFadeText() {
  return (
    <section className="nl-fade-text-section">
      <div className="nl-container" style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {LINES.map((line, i) => (
          <FadeLine key={i} line={line} />
        ))}
      </div>
    </section>
  );
}

function FadeLine({ line }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.4', 'end 0.6', 'end 0.15'],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.25, 1, 1, 0.25]);
  const y = useTransform(scrollYProgress, [0, 0.3], [16, 0]);

  const renderText = () => {
    if (!line.accent) return line.text;
    const [before, after] = line.text.split(line.accent);
    return (
      <>
        {before}<span className="accent">{line.accent}</span>{after}
      </>
    );
  };

  return (
    <motion.p ref={ref} className="nl-fade-text-line" style={{ opacity, y }}>
      {renderText()}
    </motion.p>
  );
}
