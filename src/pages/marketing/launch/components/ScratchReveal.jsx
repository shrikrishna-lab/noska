import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, PartyPopper } from 'lucide-react';

const STORAGE_KEY = 'noska_launch_scratch_revealed';
const REVEAL_THRESHOLD = 0.7;

/**
 * A canvas-based scratch card: a solid "foil" layer sits over the reveal
 * message, and dragging (mouse or touch) erases it via
 * destination-out compositing. Once ~70% of the pixels are cleared, the
 * card animates open into the full CTA and the completed state persists
 * in localStorage so returning visitors see it already unlocked.
 */
export function ScratchReveal({ onJoin }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const scratchedRef = useRef(new Set());
  const isDrawing = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setRevealed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    const setup = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#E9E4FF';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, 'rgba(109, 92, 255, 0.35)');
      grad.addColorStop(1, 'rgba(63, 166, 107, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillStyle = 'rgba(17, 17, 17, 0.55)';
      ctx.textAlign = 'center';
      ctx.fillText('✨ Something is waiting beneath...', rect.width / 2, rect.height / 2 - 10);
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillText('Scratch to unlock Early Access', rect.width / 2, rect.height / 2 + 14);
    };

    setup();
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [revealed]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const scratchAt = (x, y) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    // Sample a coarse grid to estimate cleared percentage cheaply.
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor((x / rect.width) * 12);
    const gridY = Math.floor((y / rect.height) * 12);
    scratchedRef.current.add(`${gridX}-${gridY}`);
    const pct = scratchedRef.current.size / 144;
    setProgress(Math.min(1, pct));

    if (pct >= REVEAL_THRESHOLD) {
      setRevealed(true);
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    }
  };

  const handleDown = (e) => {
    isDrawing.current = true;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const handleMove = (e) => {
    if (!isDrawing.current) return;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };
  const handleUp = () => {
    isDrawing.current = false;
  };

  return (
    <section id="scratch" className="nl-scratch-section nl-container">
      <div className="nl-scratch-card">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="revealed"
              className="nl-scratch-reveal-content"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="nl-scratch-reveal-emoji"
                initial={{ scale: 0.6, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
              >
                <PartyPopper size={40} />
              </motion.span>
              <h3>Welcome.</h3>
              <p>You're invited to join the Noska Early Access Program.</p>
              <button className="nl-btn nl-btn-primary nl-btn-lg" onClick={onJoin}>
                <Sparkles size={16} /> Join Waitlist <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="scratching"
              ref={wrapRef}
              className="nl-scratch-canvas-wrap"
              style={{ position: 'relative', height: 260 }}
              exit={{ opacity: 0 }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
              />
              <span className="nl-scratch-progress">{Math.round(progress * 100)}% scratched</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
