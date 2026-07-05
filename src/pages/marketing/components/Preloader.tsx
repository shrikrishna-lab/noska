import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A brief (~1.1s) entry loader shown once per visit to the landing page —
 * logo settles in, a thin progress bar fills, then the whole overlay
 * blurs and fades away into the hero. Scoped to Home.jsx only (not the
 * whole marketing site) since it's a first-impression moment for the
 * landing page specifically. Reimplements the referenced Framer
 * "Pre-Loader"/"Web-Preload" components natively — those are Framer
 * canvas-only code components and can't run inside a standalone app.
 */
export function Preloader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Only show once per browser session — repeat visits during the same
    // session (e.g. navigating back to "/") shouldn't replay it.
    try {
      if (sessionStorage.getItem('noska_home_preloaded') === 'true') {
        setDone(true);
        return;
      }
    } catch {}
    const t = setTimeout(() => {
      setDone(true);
      try { sessionStorage.setItem('noska_home_preloaded', 'true'); } catch {}
    }, 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="mkt-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mkt-preloader-mark">
            <motion.img
              src="/logo.png"
              alt="Noska"
              className="mkt-preloader-logo"
              initial={{ opacity: 0, scale: 0.82, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="mkt-preloader-bar">
              <motion.div
                className="mkt-preloader-bar-fill"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
