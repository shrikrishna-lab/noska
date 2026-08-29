import React from 'react';
import type { ActivityState } from './useActivityState';
import { ACTIVITY_LABELS } from './useActivityState';

interface NoskaThinkingIndicatorProps {
  state: ActivityState;
  agentName?: string;
  /** Whether to show (controls mount/unmount transition) */
  visible: boolean;
}

/**
 * Premium thinking/activity indicator for Noska AI.
 *
 * Features:
 * - CSS-driven glow animation (no React rerenders for animation)
 * - Activity state labels (Thinking, Connecting, Using tool, Generating...)
 * - Noska ✦ identity element
 * - Dark/light mode support
 * - prefers-reduced-motion support via CSS
 * - Graceful fade-in/fade-out
 */
const NoskaThinkingIndicator = React.memo(function NoskaThinkingIndicator({
  state,
  agentName,
  visible,
}: NoskaThinkingIndicatorProps) {
  if (!visible) return null;

  const label = ACTIVITY_LABELS[state] || 'Thinking';
  const isToolState = state === 'tool_call' || state === 'tool_result';

  return (
    <div
      className="noska-message-enter flex items-start gap-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={`${agentName || 'Noska AI'} is ${label.toLowerCase()}`}
    >
      {/* Glowing Noska symbol */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="noska-thinking-glow w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-700/40 flex items-center justify-center">
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium select-none">
            ✦
          </span>
        </div>
      </div>

      {/* Activity content */}
      <div className="noska-thinking-shimmer flex-1 rounded-xl px-3.5 py-2.5 min-h-[38px] flex items-center gap-2">
        {isToolState ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 dark:text-purple-400 flex-shrink-0">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {label}
              <span className="noska-activity-dots inline-flex ml-0.5 gap-[2px]">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {agentName ? `${agentName} · ` : ''}{label}
              <span className="noska-activity-dots inline-flex ml-0.5 gap-[2px]">
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
                <span className="inline-block w-[3px] h-[3px] rounded-full bg-current" />
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
});

export default NoskaThinkingIndicator;
