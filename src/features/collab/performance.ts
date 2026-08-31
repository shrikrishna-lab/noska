import { useEffect, useRef, useCallback, useState } from 'react';
import { realtimeCollab } from '../../lib/realtimeCollab';

// ─── Debounced Cursor Broadcasting ────────────────────────────

export function useDebouncedCursor(pageId: string | null, throttleMs = 50) {
  const lastSent = useRef(0);
  const pendingX = useRef(0);
  const pendingY = useRef(0);
  const pendingBlockId = useRef<string | null>(null);
  const rafId = useRef<number | null>(null);

  const send = useCallback((x: number, y: number, targetBlockId?: string | null) => {
    pendingX.current = x;
    pendingY.current = y;
    pendingBlockId.current = targetBlockId ?? null;

    if (rafId.current) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const now = Date.now();
      if (now - lastSent.current >= throttleMs && pageId) {
        realtimeCollab.sendCursor(pageId, pendingX.current, pendingY.current, pendingBlockId.current);
        lastSent.current = now;
      }
    });
  }, [pageId, throttleMs]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return send;
}

// ─── Throttled Selection Broadcasting ──────────────────────────

export function useDebouncedSelection(pageId: string | null, throttleMs = 100) {
  const lastSent = useRef(0);

  const send = useCallback((range?: { blockId?: string; startOffset?: number; endOffset?: number; text?: string } | null) => {
    const now = Date.now();
    if (now - lastSent.current >= throttleMs && pageId) {
      realtimeCollab.sendSelection(pageId, range);
      lastSent.current = now;
    }
  }, [pageId, throttleMs]);

  return send;
}

// ─── Typing Indicator (debounced) ─────────────────────────────

export function useTypingIndicator(pageId: string | null, debounceMs = 2000) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  const send = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < debounceMs) return;
    if (pageId) {
      realtimeCollab.sendTyping(pageId);
      lastSent.current = now;
    }
  }, [pageId, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  return send;
}

// ─── Batched Supabase Queries ─────────────────────────────────

interface QueryBatch<T> {
  key: string;
  query: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

const pendingQueries = new Map<string, QueryBatch<unknown>[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

export function batchQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!pendingQueries.has(key)) pendingQueries.set(key, []);
    pendingQueries.get(key)!.push({ key, query: queryFn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject });

    if (batchTimer) return;

    batchTimer = setTimeout(() => {
      const batches = new Map(pendingQueries);
      pendingQueries.clear();
      batchTimer = null;

      for (const [, items] of batches) {
        if (items.length === 1) {
          items[0].query().then(items[0].resolve).catch(items[0].reject);
        } else {
          Promise.allSettled(items.map(item => item.query())).then(results => {
            results.forEach((result, i) => {
              if (result.status === 'fulfilled') items[i].resolve(result.value);
              else items[i].reject(result.reason);
            });
          });
        }
      }
    }, 16);
  });
}

// ─── Connection Quality Monitor ────────────────────────────────

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

export function useConnectionQuality() {
  const [quality, setQuality] = useState<ConnectionQuality>('excellent');
  const [latency, setLatency] = useState(0);
  const lastPing = useRef(0);

  useEffect(() => {
    const ping = () => {
      lastPing.current = Date.now();
      const ch = realtimeCollab as unknown as { channels: Map<string, unknown> };
      if (ch.channels && ch.channels.size > 0) {
        setLatency(0);
        setQuality('excellent');
      }
    };

    const interval = setInterval(ping, 5000);
    ping();

    const handleOnline = () => setQuality(q => q === 'disconnected' ? 'excellent' : q);
    const handleOffline = () => setQuality('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { quality, latency };
}

// ─── Memory-Efficient Event Listeners ──────────────────────────

export function useStableListener<T>(
  event: string,
  handler: (data: T) => void,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = realtimeCollab.on(event as any, ((data: unknown) => handlerRef.current(data as T)) as any);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}
