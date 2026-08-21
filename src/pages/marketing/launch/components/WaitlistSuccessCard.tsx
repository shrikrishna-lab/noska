import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Sparkles, ShieldCheck, Share2, Copy, Check, Send, MessageCircle } from 'lucide-react';

interface WaitlistSuccessCardProps {
  confirmationTitle?: string;
  confirmationMessage?: string;
  position?: number | null;
  referralCode?: string | null;
  userEmail?: string;
  userName?: string;
  onReset?: () => void;
}

export function WaitlistSuccessCard({
  position,
  referralCode,
  userEmail,
  userName,
  onReset,
}: WaitlistSuccessCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Interactive 3D Mouse Tilt Motion
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 280, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 280, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'VIP Member');
  const hasPosition = typeof position === 'number' && position > 0;

  const shareUrl = referralCode
    ? `${window.location.origin}/launch?ref=${referralCode}`
    : `${window.location.origin}/launch`;

  const shareText = hasPosition
    ? `I'm #${position} on the Noska early access waitlist! Claim your VIP pass here:`
    : `I just joined the Noska early access waitlist! Claim your VIP pass here:`;

  const handleCopyLink = async () => {
    const fullText = `${shareText} ${shareUrl}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullText);
    } else {
      const el = document.createElement('textarea');
      el.value = fullText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSharePlatform = (platform: string) => {
    let url = '';
    const text = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'x':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      className="nl-success-screen"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* High Quality Landscape Photo Background */}
      <div className="nl-success-bg-wrap">
        <img
          src="/success-bg.png"
          alt="Nature Landscape"
          className="nl-success-bg-img"
        />
        <div className="nl-success-bg-overlay" />
      </div>

      <div className="nl-success-content">
        {/* Top Header Text */}
        <motion.div
          className="nl-success-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="nl-success-thankyou">
            Thankyou, {displayName}
          </h2>
          <p className="nl-success-waitlist-num">
            {hasPosition ? `You’re #${position} on the waitlist` : `You’re on the waitlist`}
          </p>
        </motion.div>

        {/* Center Frosted 3D Interactive Metallic Glass Card */}
        <motion.div
          className="nl-success-card-container"
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="nl-success-card-glass"
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.02 }}
          >
            {/* Holographic Light Sheen Sweep Overlay */}
            <div className="nl-card-hologram-sheen" />

            {/* Internal ambient camouflage / animated liquid blob shapes */}
            <div className="nl-card-liquid-blob blob-1" />
            <div className="nl-card-liquid-blob blob-2" />
            <div className="nl-card-liquid-blob blob-3" />

            {/* Micro Tech Grid Lines & Watermark Graphics */}
            <div className="nl-card-grid-bg" aria-hidden="true" />
            <div className="nl-card-watermark-text" aria-hidden="true">NOSKA</div>

            {/* Top Row: User Name & Holographic VIP Stamp Badge */}
            <div className="nl-card-top-row">
              <div className="nl-card-user-name">
                {displayName.toUpperCase()}
              </div>

              <div className="nl-card-stamp-badge">
                <ShieldCheck size={12} />
                <span>NOSKA VIP</span>
              </div>
            </div>

            {/* Floating Sparkle Micro-Graphic */}
            <div className="nl-card-sparkle-float">
              <Sparkles size={16} />
            </div>

            {/* Bottom Row: Large Position Number & Tech Serial Barcode */}
            <div className="nl-card-bottom-row">
              <motion.div
                className="nl-card-number"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {hasPosition ? position : <Sparkles size={34} />}
              </motion.div>

              {/* Minimalist Barcode & Serial Graphic */}
              <div className="nl-card-barcode-wrap">
                <div className="nl-card-barcode-lines">
                  <span /><span className="w-wide" /><span /><span className="w-mid" /><span /><span className="w-wide" /><span /><span />
                </div>
                <div className="nl-card-serial-code">
                  {hasPosition ? `NO. ${String(position).padStart(4, '0')} • VERIFIED` : `NOSKA • VERIFIED`}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Glass Share Section with Animated Platform Expand */}
        <motion.div
          className="nl-success-actions"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <AnimatePresence mode="wait">
            {!showShareOptions ? (
              <motion.button
                key="share-trigger"
                type="button"
                className="nl-card-share-btn"
                onClick={() => setShowShareOptions(true)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <Share2 size={14} />
                <span>SHARE CARD</span>
              </motion.button>
            ) : (
              <motion.div
                key="share-modal"
                className="nl-share-modal-container"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Copy Referral Link Bar */}
                <div className="nl-share-link-bar">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="nl-share-link-input"
                    aria-label="Share referral link"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`nl-share-copy-btn ${copied ? 'is-copied' : ''}`}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Social Platform Buttons Grid */}
                <div className="nl-share-platforms-grid">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleSharePlatform('x')}
                    className="nl-platform-btn x-btn"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>X / Twitter</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleSharePlatform('whatsapp')}
                    className="nl-platform-btn wa-btn"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleSharePlatform('linkedin')}
                    className="nl-platform-btn li-btn"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.47 1.47 0 1 0 0 2.94 1.47 1.47 0 0 0 0-2.94"/>
                    </svg>
                    <span>LinkedIn</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleSharePlatform('telegram')}
                    className="nl-platform-btn tg-btn"
                  >
                    <Send size={13} />
                    <span>Telegram</span>
                  </motion.button>
                </div>

                {/* Close Options Button */}
                <button
                  type="button"
                  className="nl-share-close-btn"
                  onClick={() => setShowShareOptions(false)}
                >
                  Close Options
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Reset button */}
        {onReset && (
          <button type="button" onClick={onReset} className="nl-success-reset-btn">
            Use a different email address
          </button>
        )}
      </div>
    </motion.div>
  );
}
