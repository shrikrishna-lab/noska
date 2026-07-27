import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Mail, User, Globe, AlertCircle, Loader2 } from 'lucide-react';

const REVEAL_THRESHOLD = 0.3;

interface ScratchRevealProps {
  onJoin: () => void;
  waitlistEmail: string;
  setWaitlistEmail: (v: string) => void;
  waitlistName: string;
  setWaitlistName: (v: string) => void;
  waitlistCountry: string;
  setWaitlistCountry: (v: string) => void;
  waitlistError: string;
  waitlistSubmitting: boolean;
  handleWaitlistSubmit: (e: React.FormEvent) => Promise<void>;
  collectName?: boolean;
  collectCountry?: boolean;
}

export function ScratchReveal({
  onJoin,
  waitlistEmail,
  setWaitlistEmail,
  waitlistName,
  setWaitlistName,
  waitlistCountry,
  setWaitlistCountry,
  waitlistError,
  waitlistSubmitting,
  handleWaitlistSubmit,
  collectName,
  collectCountry,
}: ScratchRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const scratchedRef = useRef(new Set<string>());
  const isDrawing = useRef(false);
  const animatingRef = useRef(false);

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

      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, '#EAD4A6');
      grad.addColorStop(0.35, '#F7E7C4');
      grad.addColorStop(0.7, '#D8B36E');
      grad.addColorStop(1, '#B89246');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      const sheen = ctx.createLinearGradient(0, 0, rect.width, 0);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(10, 10, rect.width - 20, rect.height - 20, 16);
        ctx.stroke();
      } else {
        ctx.strokeRect(10, 10, rect.width - 20, rect.height - 20);
      }

      ctx.font = '700 15px "JetBrains Mono", SFMono-Regular, Monaco, monospace';
      ctx.fillStyle = '#3B2E1E';
      ctx.textAlign = 'center';
      ctx.fillText('NOSKA EARLY ACCESS PASS', rect.width / 2, rect.height / 2 - 10);

      ctx.font = '600 12.5px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#6B5336';
      ctx.fillText('✨ Scratch to reveal your VIP ticket slot ✨', rect.width / 2, rect.height / 2 + 14);
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

    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor((x / rect.width) * 12);
    const gridY = Math.floor((y / rect.height) * 12);
    scratchedRef.current.add(`${gridX}-${gridY}`);
    const pct = scratchedRef.current.size / 144;
    const currentPct = Math.min(1, pct);
    setProgress(currentPct);

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

  const handleClaimClick = () => {
    setShowForm(true);
  };

  return (
    <section id="scratch" className="nl-scratch-section nl-container">
      <div className="nl-scratch-card">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="receipt-container"
              className="nl-receipt-card-container"
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* 3D Gold Metallic Dispenser Mouth (Fixed at Top) */}
              <div className="nl-receipt-dispenser">
                <div className="nl-dispenser-hardware">
                  <div className="nl-dispenser-mouth" />
                </div>
              </div>

              {/* Mask for Paper Rolling Out from Inside Dispenser Slit */}
              <div className="nl-paper-roll-mask">
                <motion.div
                  className="nl-receipt-paper"
                  initial={{ y: '-100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                >
                  <div className="nl-receipt-header-row">
                    <div>
                      <motion.div
                        className="nl-receipt-status-title"
                        initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.22em' }}
                        animate={{ opacity: 1, scale: 1, letterSpacing: '0.12em' }}
                        transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        EARLY ACCESS PASS
                      </motion.div>
                      <div className="nl-receipt-sub-tag">
                        {waitlistEmail ? `RESERVED FOR: ${waitlistEmail.toUpperCase()}` : 'NOSKA VIP EARLY ACCESS'}
                      </div>
                    </div>
                    <div className="nl-receipt-stamp-badge">
                      <span className="nl-receipt-stamp-logo">noska</span>
                      <span className="nl-receipt-stamp-tag">VIP ACCESS</span>
                    </div>
                  </div>

                  <div className="nl-receipt-dashed-line" />

                  {/* Form Inputs directly ON the Thermal Paper Pass */}
                  <form className="nl-apple-form" onSubmit={handleWaitlistSubmit}>
                    {collectName && (
                      <div className="nl-apple-field">
                        <label htmlFor="scratch-name" className="nl-apple-label">Full name</label>
                        <div className="nl-apple-input-wrap">
                          <User size={14} className="nl-apple-input-icon" />
                          <input
                            id="scratch-name"
                            type="text"
                            placeholder="Jane Smith"
                            className="nl-apple-input"
                            value={waitlistName}
                            onChange={(e) => setWaitlistName(e.target.value)}
                            autoComplete="name"
                          />
                        </div>
                      </div>
                    )}

                    <div className="nl-apple-field">
                      <label htmlFor="scratch-email" className="nl-apple-label">Email address</label>
                      <div className="nl-apple-input-wrap">
                        <Mail size={14} className="nl-apple-input-icon" />
                        <input
                          id="scratch-email"
                          type="email"
                          required
                          placeholder="you@company.com"
                          className="nl-apple-input"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {collectCountry && (
                      <div className="nl-apple-field">
                        <label htmlFor="scratch-country" className="nl-apple-label">Country</label>
                        <div className="nl-apple-input-wrap">
                          <Globe size={14} className="nl-apple-input-icon" />
                          <input
                            id="scratch-country"
                            type="text"
                            placeholder="United States"
                            className="nl-apple-input"
                            value={waitlistCountry}
                            onChange={(e) => setWaitlistCountry(e.target.value)}
                            autoComplete="country-name"
                          />
                        </div>
                      </div>
                    )}

                    {waitlistError && (
                      <motion.div
                        className="nl-apple-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AlertCircle size={13} />
                        <span>{waitlistError}</span>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      className="nl-apple-submit"
                      disabled={waitlistSubmitting}
                    >
                      {waitlistSubmitting ? (
                        <Loader2 size={15} className="nl-spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                    </button>
                  </form>

                  <div className="nl-receipt-dashed-line" />

                  <div className="nl-receipt-footer-text">WELCOME TO NOSKA</div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="scratching"
              ref={wrapRef}
              className="nl-scratch-canvas-wrap"
              style={{ position: 'relative', height: 280 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              {isUnlocking && <div className="nl-scratch-flash-burst" />}

              <div className="nl-scratch-under-reveal" aria-hidden="true">
                <div className="nl-scratch-under-card">
                  <div className="nl-scratch-under-icon">
                    <img src="/logo.png" alt="Noska" style={{ width: 24, height: 24, borderRadius: 6 }} />
                  </div>
                  <div className="nl-scratch-under-badge">VIP TICKET DISPENSER</div>
                  <h4 className="nl-scratch-under-title">EARLY ACCESS UNLOCKED</h4>
                  <p className="nl-scratch-under-sub">Dispensing your early access pass...</p>
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
                  {progress >= 0.3 ? 'Unlocked' : ''}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
