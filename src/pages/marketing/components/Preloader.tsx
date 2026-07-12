import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaggeredTextCycleProps {
  texts: string[];
  interval?: number;
  staggerDelay?: number;
  textColor?: string;
  font?: React.CSSProperties;
  entryYOffset?: number;
  exitYOffset?: number;
  duration?: number;
  loop?: boolean;
}

function StaggeredTextCycle({
  texts,
  interval = 1700,
  staggerDelay = 0.01,
  textColor = 'rgb(23, 23, 23)',
  font,
  entryYOffset = 40,
  exitYOffset = -40,
  duration = 0.2,
  loop = true,
}: StaggeredTextCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (!loop && nextIndex >= texts.length) {
          return prev;
        }
        return nextIndex % texts.length;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval, loop]);

  const currentText = texts[currentIndex] || '';
  const textParts = currentText.split('');

  return (
    <div style={{ position: 'relative', display: 'inline-flex', overflow: 'clip', padding: '0px 0px 5px 0px' }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          style={{ display: 'flex', color: textColor, margin: 0, ...font }}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {textParts.map((part, index) => (
            <motion.span
              key={`${currentIndex}-${index}`}
              variants={{
                hidden: { opacity: 0, y: entryYOffset },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: index * staggerDelay, duration },
                },
                exit: {
                  opacity: 0,
                  y: exitYOffset,
                  transition: { delay: index * staggerDelay, duration },
                },
              }}
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
            >
              {part}
            </motion.span>
          ))}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// Module-level cache to track if the preloader has run during the current page load session.
// This is reset on any full page reload/refresh (including hard refreshes), but persists
// during React Router client-side navigation.
let hasPreloadedOnLanding = false;

interface PreloaderProps {
  title?: string;
  slogans?: string[];
  persistKey?: string | null;
  duration?: number;
}

export function Preloader({
  title = 'NOSKA',
  slogans = [
    'A calmer way to think on a page',
    'Your notes, tasks, and ideas, unified.',
    'Built for focus and deep work.',
  ],
  persistKey = 'noska_home_preloaded',
  duration = 2700,
}: PreloaderProps) {
  const [done, setDone] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // If persistence is enabled, check our module-level tracker
    if (persistKey && hasPreloadedOnLanding) {
      setDone(true);
      return;
    }

    setShouldRender(true);

    const t = setTimeout(() => {
      setDone(true);
      if (persistKey) {
        hasPreloadedOnLanding = true;
      }
    }, duration);

    return () => clearTimeout(t);
  }, [persistKey, duration]);

  // If already done (persisted), render nothing
  if (done && !shouldRender) return null;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="mkt-preloader-wrapper"
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 1.0, ease: [1, 0.01, 0.38, 1.01] }}
        >
          {/* Main sliding panel */}
          <div className="mkt-preloader-bg">
            {/* Cyan radial blob */}
            <motion.div
              className="mkt-preloader-radial radial-cyan"
              initial={{ x: 1200, scale: 1.2, opacity: 0.8 }}
              animate={{ x: 0, scale: 1, opacity: 0.8 }}
              transition={{
                type: 'spring',
                damping: 40,
                stiffness: 400,
                mass: 1,
                duration: 2.2,
              }}
            />

            {/* Lime radial blob */}
            <motion.div
              className="mkt-preloader-radial radial-lime"
              initial={{ x: -1200, scale: 1.2, opacity: 0.8 }}
              animate={{ x: 0, scale: 1, opacity: 0.8 }}
              transition={{
                type: 'spring',
                damping: 40,
                stiffness: 400,
                mass: 1,
                duration: 2.2,
              }}
            />

            {/* Inner Content Area */}
            <div className="mkt-preloader-content">
              <div className="mkt-preloader-text-group">
                {/* Big Title WordReveal */}
                <h1 className="mkt-preloader-title">
                  {title.split('').map((char, index) => (
                    <motion.span
                      key={index}
                      initial={{ filter: 'blur(10px)', opacity: 0, scale: 3, skewY: 3, x: 200 }}
                      animate={{ filter: 'blur(0px)', opacity: 1, scale: 1, skewY: 0, x: 0 }}
                      transition={{
                        type: 'spring',
                        damping: 40,
                        stiffness: 400,
                        mass: 1,
                        delay: 0.5 + index * 0.04,
                      }}
                      style={{ display: 'inline-block', whiteSpace: 'pre' }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </h1>

                {/* Slogan Text Cycle */}
                <motion.div
                  className="mkt-preloader-slogan-wrapper"
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    bounce: 0.2,
                    delay: 0.5,
                    duration: 1.4,
                  }}
                >
                  <StaggeredTextCycle
                    texts={slogans}
                    font={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '15px',
                      fontWeight: 500,
                      letterSpacing: '-0.7px',
                      lineHeight: '1.2em',
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
