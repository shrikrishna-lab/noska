import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useMarketingScrollContainer } from './useMarketingScrollContainer';

const LINES = [
  { text: 'Ideas become knowledge.' },
  { text: 'Knowledge becomes structure.' },
  { text: 'Your workspace should think with you.', accent: 'think with you' },
  { text: 'Everything connected.' },
];

/**
 * Each line fades from muted to full ink color as it crosses the vertical
 * center of the viewport, then fades back out. Native reimplementation of
 * the referenced Framer "ScrollFadeText" component using per-line scroll
 * progress (Framer canvas-only, can't be imported into a standalone app).
 */
export function ScrollFadeText() {
  return (
    <section className="mkt-fade-text-section mkt-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        {LINES.map((line, i) => (
          <FadeLine key={i} line={line} />
        ))}
      </div>
    </section>
  );
}

function FadeLine({ line }) {
  const ref = useRef(null);
  const scrollContainer = useMarketingScrollContainer(ref);

  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollContainer || undefined,
    offset: ['start 0.85', 'start 0.4', 'end 0.6', 'end 0.15'],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.25, 1, 1, 0.25]);
  const y = useTransform(scrollYProgress, [0, 0.3], [14, 0]);

  const renderText = () => {
    if (!line.accent) return line.text;
    const [before, after] = line.text.split(line.accent);
    return (
      <>
        {before}<span className="mkt-fade-text-accent">{line.accent}</span>{after}
      </>
    );
  };

  return (
    <motion.p ref={ref} className="mkt-fade-text-line" style={{ opacity, y }}>
      {renderText()}
    </motion.p>
  );
}
