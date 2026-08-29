import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollToLatestButtonProps {
  visible: boolean;
  onClick: () => void;
}

/**
 * Floating "↓ Latest" button shown when the user is scrolled away
 * from the bottom during AI generation.
 */
const ScrollToLatestButton = React.memo(function ScrollToLatestButton({
  visible,
  onClick,
}: ScrollToLatestButtonProps) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <button
        type="button"
        onClick={onClick}
        className="noska-scroll-btn pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
          bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-md
          border border-[#e8e4db] dark:border-white/15
          shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]
          text-xs font-medium text-[var(--text-secondary)]
          hover:text-[var(--text)] hover:border-[var(--accent)]/40
          transition-colors cursor-pointer select-none"
        aria-label="Scroll to latest response"
      >
        <ChevronDown size={13} className="text-[var(--accent)]" />
        <span>Latest</span>
      </button>
    </div>
  );
});

export default ScrollToLatestButton;
