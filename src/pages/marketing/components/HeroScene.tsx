import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, GitBranch } from 'lucide-react';
import { MacWindow } from './MacWindow';
import { DashboardShell } from './DashboardShell';

/**
 * Hero visual: Noska's real workspace chrome (sidebar + topbar + doc pane,
 * see DashboardShell) inside a window frame, auto-cycling through
 * Document → Canvas → Graph so the very first thing a visitor sees is the
 * actual product, not an abstract illustration. Two smaller cards — a
 * command-palette hint and a thought-graph callout — float at different
 * depths around it. Cursor position drives a small parallax tilt per
 * layer; the main window also drifts on its own slow loop.
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
  const palX = useTransform(px, [0, 1], [-16, 16]);
  const palY = useTransform(py, [0, 1], [-11, 11]);
  const graphX = useTransform(px, [0, 1], [14, -14]);
  const graphY = useTransform(py, [0, 1], [10, -10]);

  return (
    <div ref={ref} className="hero-scene" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <motion.div className="hero-scene-main" style={{ x: mainX, y: mainY }}>
        <MacWindow title="noska.app" className="hero-scene-window">
          <div className="hero-scene-dash-stage">
            <DashboardShell mode={mode} instanceId="hero" className="dash-compact" />
          </div>
        </MacWindow>
      </motion.div>

      <motion.div
        className="hero-scene-float hero-scene-palette"
        style={{ x: palX, y: palY }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="hs-palette-row">
          <Sparkles size={13} />
          <span>Ask Noska anything…</span>
        </div>
        <div className="hs-palette-hint">
          <Sparkles size={11} />
          <span>Summarize this page</span>
        </div>
      </motion.div>

      <motion.div
        className="hero-scene-float hero-scene-graph"
        style={{ x: graphX, y: graphY }}
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <div className="hs-graph-header">
          <GitBranch size={12} />
          <span>Connected</span>
        </div>
        <div className="hs-graph-nodes">
          <span className="hs-node n1" />
          <span className="hs-node n2" />
          <span className="hs-node n3" />
          <span className="hs-edge e1" />
          <span className="hs-edge e2" />
        </div>
      </motion.div>
    </div>
  );
}
