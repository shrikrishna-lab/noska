import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAnnouncementBar, type AnnouncementBarData } from '../../../hooks/useLaunchSettings';
import { Banner, type BannerTheme } from '../../../components/ui/banner';
import { Sparkles, Link as LinkIcon, Gift, Bell, Zap, Flame, Rocket } from 'lucide-react';

const PAGE_PATHS: Record<string, string> = {
  home: '/',
  pricing: '/pricing',
  product: '/product',
  enterprise: '/enterprise',
  blog: '/blog',
  docs: '/docs',
};

// Map emoji/keyword to an icon
function getIconForEmoji(emoji?: string) {
  if (!emoji) return <Sparkles className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('🔗') || emoji.includes('link')) return <LinkIcon className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('🎁') || emoji.includes('gift')) return <Gift className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('🚀') || emoji.includes('rocket')) return <Rocket className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('⚡') || emoji.includes('zap')) return <Zap className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('🔥') || emoji.includes('fire')) return <Flame className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes('🔔') || emoji.includes('bell')) return <Bell className="h-4 w-4 text-emerald-800" />;
  return <span className="text-sm leading-none">{emoji}</span>;
}

// Map color/styling into BannerTheme
function resolveTheme(bar: AnnouncementBarData): BannerTheme {
  const bg = (bar.background_color || '').toLowerCase();
  const grad = (bar.gradient_start || '').toLowerCase();
  
  if (bar.bg_style === 'solid' && (bg.includes('#1a1a') || bg.includes('#0909') || bg.includes('#000000') || bg.includes('#1818'))) {
    return 'dark';
  }
  if (grad.includes('purple') || grad.includes('fuchsia') || bg.includes('#8b5cf6') || bg.includes('#7c3aed') || bg.includes('#9333ea')) {
    return 'violet';
  }
  if (grad.includes('amber') || grad.includes('orange') || bg.includes('#f59e0b') || bg.includes('#d97706')) {
    return 'amber';
  }
  if (grad.includes('blue') || grad.includes('sky') || bg.includes('#3b82f6') || bg.includes('#0284c7')) {
    return 'blue';
  }
  if (grad.includes('rose') || grad.includes('red') || bg.includes('#f43f5e') || bg.includes('#e11d48')) {
    return 'rose';
  }
  return 'emerald';
}

export function AnnouncementBar({ placement = 'top' }: { placement?: 'top' | 'bottom' }) {
  const { bar, loading } = useAnnouncementBar();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Reset dismissed state if bar text/id changes
  useEffect(() => {
    if (bar?.text) {
      setDismissed(false);
      setVisible(true);
    }
  }, [bar?.text]);

  const matchesPageTarget = useCallback(() => {
    if (!bar || !bar.page_target || bar.page_target === 'all') return true;
    const targets = bar.page_target.split(',').map((t) => t.trim());
    return targets.some((t) => PAGE_PATHS[t] && (location.pathname === PAGE_PATHS[t] || location.pathname.startsWith(PAGE_PATHS[t])));
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
      if (diff <= 0) {
        setTimeLeft('Launching now!');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m left`);
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

  const resolvedTheme = resolveTheme(bar);

  // Handle action click
  const handleActionClick = () => {
    if (!bar.link_url) return;
    if (bar.link_url.startsWith('http')) {
      window.open(bar.link_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(bar.link_url);
    }
  };

  const actionConfig = bar.link_text
    ? {
        label: bar.link_text,
        onClick: handleActionClick,
      }
    : bar.link_url
    ? {
        label: 'Get Started',
        onClick: handleActionClick,
      }
    : undefined;

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${placement === 'top' ? 'pt-3 pb-1' : 'py-3'}`}>
      <Banner
        show={true}
        onHide={bar.dismissible ? () => setDismissed(true) : undefined}
        showCloseButton={bar.dismissible && bar.show_close_button !== false}
        icon={getIconForEmoji(bar.emoji)}
        theme={resolvedTheme}
        title={
          <span className="flex flex-wrap items-center gap-1.5 font-normal">
            <span>{bar.text}</span>
            {bar.countdown_enabled && timeLeft && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-black/10 dark:bg-white/15">
                ⏱ {timeLeft}
              </span>
            )}
          </span>
        }
        action={actionConfig}
        learnMoreUrl={bar.secondary_link_url || undefined}
      />
    </div>
  );
}
export default AnnouncementBar;
