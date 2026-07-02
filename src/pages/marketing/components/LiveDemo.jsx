import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

/**
 * The hero product mockup. A real interactive recreation of the actual
 * Noska sidebar + editor chrome (not a screenshot, not a stock photo) with
 * a cursor-tracked 3D tilt for depth. Content mirrors real app structure —
 * page tree, block types, AI panel — rather than invented screenshots.
 */
export function LiveDemo() {
  const ref = useRef(null);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Wire up the database view switcher', done: true },
    { id: 2, text: 'Ship graph view node physics', done: true },
    { id: 3, text: 'Add spaced-repetition review queue', done: false },
  ]);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const glowX = useTransform(rotateY, [-8, 8], [0, 100]);
  const glowY = useTransform(rotateX, [8, -8], [0, 100]);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 10);
    rotateX.set((0.5 - py) * 10);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const toggleTodo = (id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <div
      ref={ref}
      className="demo-perspective"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="demo-window"
        style={{ rotateX, rotateY }}
      >
        <div
          className="demo-glow"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.12), transparent 60%)`
            ),
          }}
        />
        <div className="demo-topbar">
          <div className="demo-dots">
            <span className="demo-dot red" />
            <span className="demo-dot yellow" />
            <span className="demo-dot green" />
          </div>
          <div className="demo-address">noska.app/my-workspace</div>
        </div>
        <div className="demo-body">
          <aside className="demo-sidebar">
            <div className="demo-sidebar-title">Workspace</div>
            <div className="demo-sidebar-item active">📄 Sprint Planning</div>
            <div className="demo-sidebar-item">🗄️ Roadmap Database</div>
            <div className="demo-sidebar-item">🕸️ Graph View</div>
            <div className="demo-sidebar-item">🧠 Study Deck</div>
            <div className="demo-sidebar-item">🔒 Encrypted Notes</div>
          </aside>
          <div className="demo-content">
            <h4 className="demo-heading">Sprint Planning</h4>
            <div className="demo-todos">
              {todos.map((t) => (
                <button key={t.id} className="demo-todo" onClick={() => toggleTodo(t.id)}>
                  <span className={`demo-checkbox ${t.done ? 'checked' : ''}`}>
                    {t.done && <Check size={11} />}
                  </span>
                  <span className={t.done ? 'demo-todo-done' : ''}>{t.text}</span>
                </button>
              ))}
            </div>
            <div className="demo-ai-row">
              <Sparkles size={13} />
              <span>Ask AI to summarize this page…</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
