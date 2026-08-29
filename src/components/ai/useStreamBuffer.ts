import { useRef, useCallback } from 'react';

/**
 * Batches rapid stream chunks to prevent hundreds of React state updates per second.
 *
 * Instead of calling setMessages() on every single token, chunks accumulate in a ref
 * and are flushed via requestAnimationFrame (max ~60 UI updates/s).
 */
export function useStreamBuffer() {
  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef<((accumulated: string) => void) | null>(null);

  /**
   * Register the flush callback. Call this once before streaming starts.
   * The callback receives the full accumulated text so far.
   */
  const onFlush = useCallback((cb: (accumulated: string) => void) => {
    callbackRef.current = cb;
  }, []);

  /**
   * Append a chunk from the stream. Does NOT trigger React state immediately.
   * Instead, schedules a batched flush via requestAnimationFrame.
   */
  const appendChunk = useCallback((chunk: string) => {
    bufferRef.current = chunk; // chunk is the full accumulated text

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const text = bufferRef.current;
        if (callbackRef.current && text) {
          callbackRef.current(text);
        }
      });
    }
  }, []);

  /**
   * Force an immediate flush (e.g. when streaming completes).
   */
  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const text = bufferRef.current;
    if (callbackRef.current && text) {
      callbackRef.current(text);
    }
  }, []);

  /**
   * Reset the buffer for a new generation.
   */
  const reset = useCallback(() => {
    bufferRef.current = '';
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Get the current buffered text without flushing */
  const getBuffered = useCallback(() => bufferRef.current, []);

  return { appendChunk, flush, reset, onFlush, getBuffered };
}
