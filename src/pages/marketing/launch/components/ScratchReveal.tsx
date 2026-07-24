import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, PartyPopper } from 'lucide-react';

const STORAGE_KEY = 'noska_launch_scratch_revealed';
const REVEAL_THRESHOLD = 0.3; // 30% threshold for auto-reveal

/**
 * A canvas-based scratch card: a solid "foil" layer sits over the reveal
 * message, and dragging (mouse or touch) erases it via
 * destination-out compositing. Once 30% of the pixels are cleared, the
 * card triggers a cinematic dissolve & shimmer burst animation into the
 * full CTA unlocked state, persisting in localStorage.
 */
export function ScratchReveal({ onJoin }: { onJoin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [progress, setProgress] = useState(0);
  const scratchedRef = useRef(new Set<string>());
  const isDrawing = useRef(false);
  const animatingRef = useRef(false);

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
    if (!ctx) return;
    let dpr = window.devicePixelRatio || 1;

    const setup = () => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Base foil gradient (iridescent metallic pastel finish)
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, '#C7D2FE');
      grad.addColorStop(0.35, '#E0E7FF');
      grad.addColorStop(0.7, '#DDD6FE');
      grad.addColorStop(1, '#BAE6FD');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Sheen reflection
      ctx.save();
      const sheen = ctx.createLinearGradient(0, 0, rect.width, 0);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.restore();

      // Foil border outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(10, 10, rect.width - 20, rect.height - 20, 16);
        ctx.stroke();
      } else {
        ctx.strokeRect(10, 10, rect.width - 20, rect.height - 20);
      }

      // Typography on canvas foil
      ctx.font = '600 15px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#3730A3';
      ctx.textAlign = 'center';
      ctx.fillText('✨ Something is waiting beneath...', rect.width / 2, rect.height / 2 - 10);

      ctx.font = '500 13px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#4F46E5';
      ctx.fillText('Scratch 30% to unlock Early Access', rect.width / 2, rect.height / 2 + 14);
    };

    setup();
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [revealed]);

  const getPos = (e: any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const scratchAt = (x: number, y: number) => {
    if (animatingRef.current || revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // Sample coarse grid to estimate cleared percentage
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor((x / rect.width) * 12);
    const gridY = Math.floor((y / rect.height) * 12);
    scratchedRef.current.add(`${gridX}-${gridY}`);
    const pct = scratchedRef.current.size / 144;
    const currentPct = Math.min(1, pct);
    setProgress(currentPct);

    // Auto-reveal when 30% threshold is reached with smooth dissolve animation
    if (currentPct >= REVEAL_THRESHOLD && !animatingRef.current) {
      animatingRef.current = true;
      setIsUnlocking(true);

      let alpha = 1;
      const fadeStep = () => {
        alpha -= 0.07;
        if (canvas) {
          canvas.style.opacity = Math.max(0, alpha).toString();
          canvas.style.transform = `scale(${1 + (1 - Math.max(0, alpha)) * 0.05})`;
          canvas.style.filter = `blur(${(1 - Math.max(0, alpha)) * 12}px)`;
        }
        if (alpha > 0) {
          requestAnimationFrame(fadeStep);
        } else {
          setRevealed(true);
          try {
            localStorage.setItem(STORAGE_KEY, 'true');
          } catch {}
        }
      };
      requestAnimationFrame(fadeStep);
    }
  };

  const handleDown = (e: any) => {
    isDrawing.current = true;
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };

  const handleMove = (e: any) => {
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
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 20,
              }}
            >
              <motion.div
                className="nl-scratch-badge-wrapper"
                initial={{ scale: 0.4, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.1 }}
              >
                <div className="nl-scratch-badge-pulse" />
                <div className="nl-scratch-badge-icon">
                  <PartyPopper size={32} />
                </div>
              </motion.div>

              <h3>VIP Early Access Unlocked!</h3>
              <p>You've unlocked Noska's exclusive pre-launch workspace program.</p>
              <button className="nl-btn nl-btn-primary nl-btn-lg" onClick={onJoin}>
                <Sparkles size={16} /> Claim Your Spot <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="scratching"
              ref={wrapRef}
              className="nl-scratch-canvas-wrap"
              style={{ position: 'relative', height: 280 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              {/* Flash Burst Overlay during 30% unlock */}
              {isUnlocking && <div className="nl-scratch-flash-burst" />}

              {/* Underlying reveal card layer under erased pixels */}
              <div className="nl-scratch-under-reveal" aria-hidden="true">
                <div className="nl-scratch-under-card">
                  <div className="nl-scratch-under-icon">
                    <Sparkles size={28} />
                  </div>
                  <h4>EARLY ACCESS UNLOCKED</h4>
                  <p>Revealing your private invitation...</p>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                style={{ transition: 'filter 0.1s ease, transform 0.1s ease' }}
                onMouseDown={handleDown}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
              />

              <div className={`nl-scratch-progress-pill ${progress >= 0.3 ? 'is-unlocked' : ''}`}>
                <div
                  className="nl-scratch-progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.round((progress / 0.3) * 100))}%` }}
                />
                <span className="nl-scratch-progress-text">
                  {progress >= 0.3 ? '✨ Unlocking!' : `${Math.round(progress * 100)}% / 30% scratched`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
