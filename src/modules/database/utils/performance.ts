import { useState, useRef, useCallback, useEffect, useMemo, type RefObject } from "react";

export interface VirtualItem<T> {
  index: number;
  item: T;
  style: { position: "absolute"; top: number; left: number; right: number; height: number };
}

export interface VirtualScrollResult<T> {
  containerRef: RefObject<HTMLDivElement | null>;
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  scrollTop: number;
  onScroll: () => void;
}

/**
 * Virtual scrolling hook for rendering large lists efficiently.
 *
 * @param items - all items
 * @param itemHeight - height of each row in px
 * @param overScan - extra items to render outside viewport
 */
export function useVirtualScroll<T>(items: T[], itemHeight: number, overScan = 5): VirtualScrollResult<T> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;

  const virtualItems = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overScan);
    const endIdx = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overScan);
    const visible: VirtualItem<T>[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      visible.push({
        index: i,
        item: items[i],
        style: { position: 'absolute', top: i * itemHeight, left: 0, right: 0, height: itemHeight },
      });
    }
    return visible;
  }, [items, scrollTop, containerHeight, itemHeight, overScan]);

  return {
    containerRef,
    virtualItems,
    totalHeight,
    scrollTop,
    onScroll: handleScroll,
  };
}

/**
 * Debounce a function call.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, timeout = 300): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), timeout);
  };
}

/**
 * Batch updates for performance (coalesces calls to once per animation frame).
 */
export function batch<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  let queued = false;
  let lastArgs: A;
  return (...args: A) => {
    lastArgs = args;
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn(...lastArgs);
      });
    }
  };
}
