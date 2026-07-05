import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMarketingScrollContainer } from './useMarketingScrollContainer';

/**
 * Converts normal vertical scroll progress through a tall section into
 * horizontal translation of an inner track — panning a row of cards
 * sideways as the visitor scrolls down. Native reimplementation of the
 * referenced Framer "Horiscroll" component (Framer canvas-only, can't be
 * imported into a standalone app).
 */
export function Horiscroll({ children, className = '', trackClassName = '', heightVh = 220 }) {
  const sectionRef = useRef(null);
  const scrollContainer = useMarketingScrollContainer(sectionRef);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainer || undefined,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-60%']);

  return (
    <div className={`mkt-horiscroll ${className}`} ref={sectionRef} style={{ height: `${heightVh}vh` }}>
      <div className="mkt-horiscroll-sticky">
        <motion.div className={`mkt-horiscroll-track ${trackClassName}`} style={{ x }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
