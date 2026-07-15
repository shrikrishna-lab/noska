import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Auto-advancing slideshow where each slide wipes in from the side and the
 * previous one wipes out, on a timer — native reimplementation of the
 * referenced Framer "HeroWipeSlideshow" component (Framer canvas-only,
 * can't be imported into a standalone app).
 */
export function HeroWipeSlideshow({ slides, interval = 3200, className = '' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(id);
  }, [slides.length, interval]);

  return (
    <div className={`mkt-wipe-slideshow ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="mkt-wipe-slide"
          initial={{ clipPath: 'inset(0 0 0 100%)' }}
          animate={{ clipPath: 'inset(0 0 0 0%)' }}
          exit={{ clipPath: 'inset(0 100% 0 0)' }}
          transition={{ duration: 0.55, ease: [0.83, 0, 0.17, 1] }}
        >
          {slides[index]}
        </motion.div>
      </AnimatePresence>
      <div className="mkt-wipe-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`mkt-wipe-dot ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
