import { useState, useEffect } from 'react';
import { useAnnouncementBar } from '../../../hooks/useLaunchSettings';

export function AnnouncementBar() {
  const { bar, loading } = useAnnouncementBar();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

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

  if (loading || !bar || !bar.enabled || dismissed) return null;

  return (
    <div
      className={`announcement-bar ${bar.sticky ? 'announcement-sticky' : ''}`}
      style={{ backgroundColor: bar.background_color, color: bar.text_color }}
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
        {bar.dismissible && (
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
