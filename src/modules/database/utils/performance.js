import { useState, useRef, useCallback, useEffect, useMemo } from "react";

/**
 * Virtual scrolling hook for rendering large lists efficiently.
 *
 * @param {Array} items - all items
 * @param {number} itemHeight - height of each row in px
 * @param {number} [overScan=5] - extra items to render outside viewport
 * @returns {{ containerRef, virtualItems, totalHeight, scrollTop }}
 */
export function useVirtualScroll(items, itemHeight, overScan = 5) {
  const containerRef = useRef(null);
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
    const visible = [];
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
 * Memoize expensive computations.
 * @param {Function} fn
 * @param {number} [timeout=300]
 * @returns {Function}
 */
export function debounce(fn, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), timeout);
  };
}

/**
 * Batch updates for performance.
 * @param {Function} fn
 * @returns {Function}
 */
export function batch(fn) {
  let queued = false;
  let lastArgs;
  return (...args) => {
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
