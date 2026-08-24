import { useEffect, useMemo, useState } from 'react';
import {
  motion, useMotionValue, useSpring, useReducedMotion,
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   McpAtmosphere — the living background for the MCP page.

   Layers (back → front):
   1. Aurora conic glow, slowly rotating (CSS)
   2. Three depth orbs — scroll-parallaxed AND infinitely drifting,
      plus a whisper of pointer parallax
   3. Floating RPC glyphs ({, }, →, "…" ) rising like fireflies

   Everything honors prefers-reduced-motion by going static.
   ───────────────────────────────────────────────────────────── */

const GLYPHS = ['{', '}', '→', '←', '"rpc"', '01', '::', '=>', '[]', 'nsk', '⌘', '✦', '{ }', '·', '→', '✳'];

function useMarketingScroll() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = document.querySelector('.marketing');
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollHeight - el.clientHeight;
        setProgress(max > 0 ? el.scrollTop / max : 0);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return progress;
}

export function ScrollProgress() {
  const progress = useMarketingScroll();
  return (
    <div className="mcp-progress" aria-hidden>
      <div className="mcp-progress-fill" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

/** Parallax helper: returns a pixel offset that follows the marketing
 * scroll container at `speed` — cheap scroll-linked depth. */
function useDriftOnScroll(speed, reduce) {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const el = document.querySelector('.marketing');
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(el.scrollTop * speed));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [speed, reduce]);
  return y;
}

export function McpAtmosphere() {  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 20 });
  const sy = useSpring(py, { stiffness: 40, damping: 20 });

  // Page scroll parallax (marketing site scrolls inside .marketing)
  const yShift1 = useDriftOnScroll(0.06, reduce);
  const yShift2 = useDriftOnScroll(0.12, reduce);
  const yShift3 = useDriftOnScroll(0.2, reduce);

  useEffect(() => {
    if (reduce) return;
    const move = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      px.set(((e.clientX - cx) / cx) * 26);
      py.set(((e.clientY - cy) / cy) * 18);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, [px, py, reduce]);

  const glyphs = useMemo(
    () => GLYPHS.map((g, i) => ({
      g,
      left: (i * 61.8) % 100,
      size: 11 + ((i * 7) % 16),
      dur: 16 + ((i * 13) % 18),
      delay: -((i * 3.7) % 20),
      gold: i % 3 === 0,
    })),
    [],
  );

  if (reduce) {
    return <div className="mcp-atmo" aria-hidden />;
  }

  return (
    <div className="mcp-atmo" aria-hidden>
      <div className="mcp-aurora" />
      <motion.div className="mcp-orb orb-1" style={{ y: yShift1, x: sx }} />
      <motion.div className="mcp-orb orb-2" style={{ y: yShift2, x: sy }} />
      <motion.div className="mcp-orb orb-3" style={{ y: yShift3, x: sx }} />
      <div className="mcp-glyphs">
        {glyphs.map((gl, i) => (
          <span
            key={i}
            className={`mcp-glyph ${gl.gold ? 'gold' : ''}`}
            style={{
              left: `${gl.left}%`,
              fontSize: gl.size,
              animationDuration: `${gl.dur}s`,
              animationDelay: `${gl.delay}s`,
            }}
          >
            {gl.g}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Scroll-cue at the hero's base — a breathing gold line */
export function ScrollCue({ label = 'scroll' }) {
  return (
    <div className="mcp-scrollcue" aria-hidden>
      <span className="mcp-scrollcue-label">{label}</span>
      <span className="mcp-scrollcue-line"><i /></span>
    </div>
  );
}