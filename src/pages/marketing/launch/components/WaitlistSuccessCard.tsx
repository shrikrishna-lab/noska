import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Share2,
  ArrowUpRight,
  RotateCcw,
  Trophy,
} from 'lucide-react';

interface WaitlistSuccessCardProps {
  confirmationTitle?: string;
  confirmationMessage?: string;
  position?: number | null;
  referralCode?: string | null;
  userEmail?: string;
  onReset?: () => void;
}

export function WaitlistSuccessCard({
  confirmationTitle,
  confirmationMessage,
  position,
  referralCode,
  userEmail,
  onReset,
}: WaitlistSuccessCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = referralCode
    ? `${window.location.origin}/launch?ref=${referralCode}`
    : `${window.location.origin}/launch`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    } else {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = "I just joined the waitlist for Noska — the all-in-one workspace for notes, docs & AI!";

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="nl-waitlist-success-card"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Success Header */}
      <div className="nl-waitlist-card-header">
        <div className="nl-waitlist-icon-wrapper">
          <div className="nl-waitlist-icon-pulse" />
          <div className="nl-waitlist-icon-badge">
            <CheckCircle2 size={26} className="nl-waitlist-icon-svg" />
          </div>
        </div>

        <h3 className="nl-waitlist-card-title">
          {confirmationTitle || "You're on the list!"}
        </h3>

        <p className="nl-waitlist-card-subtitle">
          {confirmationMessage ||
            (userEmail
              ? `We've saved a spot for ${userEmail}. We'll notify you as soon as access opens up.`
              : "We've saved your spot! We'll notify you as soon as access opens up.")}
        </p>
      </div>

      {/* Queue Position Highlight Badge */}
      {position !== null && position !== undefined && (
        <div className="nl-waitlist-position-card">
          <div className="nl-waitlist-position-top">
            <span className="nl-waitlist-live-dot" />
            <span className="nl-waitlist-position-tagline">
              LIVE QUEUE STATUS
            </span>
          </div>

          <div className="nl-waitlist-position-main">
            <span className="nl-waitlist-position-number">#{position}</span>
            <span className="nl-waitlist-position-sub">in line for early access</span>
          </div>

          <div className="nl-waitlist-position-footer">
            <Sparkles size={13} style={{ color: 'var(--nl-accent)' }} />
            <span>Spots are released continuously in order of registration</span>
          </div>
        </div>
      )}

      {/* Referral Link Card */}
      {referralCode && (
        <div className="nl-waitlist-referral-card">
          <div className="nl-waitlist-referral-header">
            <div className="nl-waitlist-referral-badge">
              <Trophy size={13} />
              <span>Priority Access</span>
            </div>
            <h4>Move up the queue</h4>
            <p>
              Share your invite link — for each friend who joins, you bump up <strong>1 spot</strong> ahead in line.
            </p>
          </div>

          {/* Copy Link Input Bar */}
          <div className="nl-waitlist-copy-bar">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="nl-waitlist-copy-input"
              aria-label="Referral share link"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`nl-waitlist-copy-btn ${copied ? 'is-copied' : ''}`}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="nl-waitlist-social-share">
            <span className="nl-waitlist-share-label">
              <Share2 size={13} /> Quick share:
            </span>
            <div className="nl-waitlist-social-btns">
              <button
                type="button"
                onClick={handleShareX}
                className="nl-social-btn"
                title="Share on X (Twitter)"
              >
                <span>X / Twitter</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                type="button"
                onClick={handleShareLinkedIn}
                className="nl-social-btn"
                title="Share on LinkedIn"
              >
                <span>LinkedIn</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="nl-social-btn"
                title="Share via WhatsApp"
              >
                <span>WhatsApp</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset / Register another email option */}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="nl-waitlist-reset-btn"
        >
          <RotateCcw size={13} />
          <span>Use a different email address</span>
        </button>
      )}
    </motion.div>
  );
}
