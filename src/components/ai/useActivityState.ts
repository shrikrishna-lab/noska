import { useState, useCallback } from 'react';

/**
 * AI activity states for the generation lifecycle.
 * Replaces the single `loading` boolean with proper state transitions.
 */
export type ActivityState =
  | 'idle'
  | 'connecting'
  | 'thinking'
  | 'generating'
  | 'tool_call'
  | 'tool_result'
  | 'finalizing'
  | 'completed'
  | 'cancelled'
  | 'error';

const ACTIVE_STATES: Set<ActivityState> = new Set([
  'connecting', 'thinking', 'generating', 'tool_call', 'tool_result', 'finalizing'
]);

/** Human-readable labels for each activity state */
export const ACTIVITY_LABELS: Record<ActivityState, string> = {
  idle: '',
  connecting: 'Connecting',
  thinking: 'Thinking',
  generating: 'Generating',
  tool_call: 'Using tool',
  tool_result: 'Processing result',
  finalizing: 'Finalizing',
  completed: '',
  cancelled: 'Stopped',
  error: 'Error',
};

export interface UseActivityStateReturn {
  state: ActivityState;
  /** Whether any generation-related activity is in progress */
  isActive: boolean;
  /** Whether actual text content is being generated (streaming) */
  isGenerating: boolean;
  /** Whether the AI is thinking (pre-response) */
  isThinking: boolean;
  /** Human-readable label for the current state */
  label: string;
  /** Transition to a new state */
  setActivity: (next: ActivityState) => void;
  /** Reset to idle */
  reset: () => void;
}

/**
 * Hook to manage the AI generation activity state machine.
 *
 * State flow:
 *   idle → connecting → thinking → generating → completed
 *                     → tool_call → tool_result → generating
 *                     → error
 *                     → cancelled
 */
export function useActivityState(): UseActivityStateReturn {
  const [state, setState] = useState<ActivityState>('idle');

  const setActivity = useCallback((next: ActivityState) => {
    setState(next);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
  }, []);

  return {
    state,
    isActive: ACTIVE_STATES.has(state),
    isGenerating: state === 'generating',
    isThinking: state === 'thinking' || state === 'connecting',
    label: ACTIVITY_LABELS[state],
    setActivity,
    reset,
  };
}
