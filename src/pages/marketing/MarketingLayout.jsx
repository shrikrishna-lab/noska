import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './marketing-theme.css';

/**
 * Shared shell for every public marketing route (/, /pricing, /enterprise,
 * /product). Wraps content in a `.marketing` scope so marketing-theme.css's
 * tokens/resets never leak into the authenticated app's own design system
 * (src/index.css) — the two stylesheets are namespaced independently.
 *
 * Also drives buttery-smooth scrolling site-wide via the real `lenis` npm
 * package (native reimplementation of the referenced Framer "Lenis" code
 * component, which only runs inside Framer's own canvas). The marketing
 * site scrolls inside this `.marketing` element itself — not `window` —
 * (see the height/overflow rules in marketing-theme.css), so Lenis is
 * pointed at it explicitly via `wrapper`/`content` instead of defaulting
 * to window scroll.
 */
export default function MarketingLayout({ children }) {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current || !contentRef.current) return;

    const lenis = new Lenis({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="marketing" ref={wrapperRef}>
      <div ref={contentRef}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
