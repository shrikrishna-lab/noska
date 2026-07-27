import { useState, useEffect, useCallback } from 'react';
import { useAnnouncementBar } from '../../../hooks/useLaunchSettings';
import { useLocation } from 'react-router-dom';

const PAGE_PATHS: Record<string, string> = {
  home: '/',
  pricing: '/pricing',
  product: '/product',
  enterprise: '/enterprise',
  blog: '/blog',
  docs: '/docs',
};

export function AnnouncementBar({ placement = 'top' }: { placement?: 'top' | 'bottom' }) {
  const { bar, loading } = useAnnouncementBar();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(true);
  const location = useLocation();

  const matchesPageTarget = useCallback(() => {
    if (!bar || bar.page_target === 'all') return true;
    const targets = bar.page_target.split(',').map((t) => t.trim());
    return targets.some((t) => PAGE_PATHS[t] && location.pathname.startsWith(PAGE_PATHS[t]));
  }, [bar, location.pathname]);

  const isWithinSchedule = useCallback(() => {
    if (!bar) return true;
    const now = Date.now();
    if (bar.start_at && new Date(bar.start_at).getTime() > now) return false;
    if (bar.end_at && new Date(bar.end_at).getTime() < now) return false;
    return true;
  }, [bar]);

  useEffect(() => {
    if (!bar?.countdown_enabled || !bar?.countdown_target) return;
    const update = () => {
      const diff = new Date(bar.countdown_target!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Launching now!'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [bar?.countdown_target, bar?.countdown_enabled]);

  useEffect(() => {
    if (!bar?.auto_dismiss_seconds) return;
    const timer = setTimeout(() => setVisible(false), bar.auto_dismiss_seconds * 1000);
    return () => clearTimeout(timer);
  }, [bar?.auto_dismiss_seconds]);

  if (loading || !bar || !bar.enabled || dismissed || !visible) return null;

  if (!matchesPageTarget()) return null;
  if (!isWithinSchedule()) return null;

  const positionMatch =
    placement === 'top'
      ? bar.position === 'top' || bar.position === 'both'
      : bar.position === 'bottom' || bar.position === 'both';

  if (!positionMatch) return null;

  const animationClass = bar.animation !== 'none' ? `announcement-anim-${bar.animation}` : '';
  const fontSizeClass = `announcement-fs-${bar.font_size || 'md'}`;
  const borderClass = `announcement-border-${bar.border_style || 'bottom'}`;
  const placementClass = `announcement-placement-${placement}`;

  return (
    <div
      className={`announcement-bar ${bar.sticky ? 'announcement-sticky' : ''} ${animationClass} ${fontSizeClass} ${borderClass} ${placementClass}`}
      style={
        bar.bg_style === 'gradient'
          ? { background: `linear-gradient(135deg, ${bar.gradient_start || bar.background_color}, ${bar.gradient_end || bar.background_color})`, color: bar.text_color }
          : { backgroundColor: bar.background_color, color: bar.text_color }
      }
    >
      <div className="announcement-bar-content">
        <span className="announcement-bar-text">
          {bar.emoji && <span className="announcement-emoji">{bar.emoji}</span>}
          {bar.text}
          {bar.countdown_enabled && timeLeft && (
            <span className="announcement-countdown"> · {timeLeft}</span>
          )}
        </span>
        {bar.link_url && (
          <a
            href={bar.link_url}
            className="announcement-link"
            style={{ color: bar.text_color }}
            target="_blank"
            rel="noreferrer"
          >
            {bar.link_text || 'Learn more'} →
          </a>
        )}
        {bar.secondary_link_url && (
          <a
            href={bar.secondary_link_url}
            className="announcement-link announcement-link-secondary"
            style={{ color: bar.text_color }}
            target="_blank"
            rel="noreferrer"
          >
            {bar.secondary_link_text || 'Get started'} ↗
          </a>
        )}
        {bar.show_close_button && bar.dismissible && (
          <button
            className="announcement-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            style={{ color: bar.text_color }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
