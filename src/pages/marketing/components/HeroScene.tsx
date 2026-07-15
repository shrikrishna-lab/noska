import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MacWindow } from './MacWindow';
import { DashboardShell } from './DashboardShell';

/**
 * Hero visual: Noska's real workspace chrome (sidebar + topbar + doc pane,
 * see DashboardShell) inside a window frame, auto-cycling through
 * Document → Canvas → Graph so the very first thing a visitor sees is the
 * actual product, not an abstract illustration. Cursor position drives a
 * small parallax tilt on the window; it also drifts on its own slow loop.
 */
export function HeroScene() {
  const ref = useRef(null);
  const px = useSpring(useMotionValue(0.5), { stiffness: 55, damping: 22 });
  const py = useSpring(useMotionValue(0.5), { stiffness: 55, damping: 22 });
  // Opens on Graph — the most visually distinctive of the three views — so
  // the first paint reads as a bigger, roomier connected-workspace shot,
  // then keeps cycling through the other real views for delight.
  const [mode, setMode] = useState('graph');

  useEffect(() => {
    const order = ['graph', 'doc', 'canvas'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % order.length;
      setMode(order[i]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const mainX = useTransform(px, [0, 1], [-7, 7]);
  const mainY = useTransform(py, [0, 1], [-5, 5]);

  return (
    <div ref={ref} className="hero-scene" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <motion.div className="hero-scene-main" style={{ x: mainX, y: mainY }}>
        <MacWindow title="noska.app" className="hero-scene-window">
          <div className="hero-scene-dash-stage">
            <DashboardShell mode={mode} instanceId="hero" className="dash-compact" />
          </div>
        </MacWindow>
      </motion.div>
    </div>
  );
}
