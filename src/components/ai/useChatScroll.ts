import { useRef, useState, useCallback, useEffect } from 'react';

export type ScrollState = 'following' | 'near_bottom' | 'user_scrolling' | 'detached';

const NEAR_BOTTOM_THRESHOLD = 100; // px from bottom to consider "near"
const SCROLL_THROTTLE_MS = 16; // ~60fps

export interface UseChatScrollReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current scroll state */
  scrollState: ScrollState;
  /** Whether the user is detached from the bottom (show scroll-to-latest) */
  isDetached: boolean;
  /** Scroll handler — attach to the container's onScroll */
  handleScroll: () => void;
  /** Smoothly follow the latest content (call during streaming) */
  followLatest: () => void;
  /** Jump to latest and resume following */
  scrollToLatest: () => void;
  /** Anchor around a specific element (call after user sends message) */
  anchorToElement: (el: HTMLElement | null) => void;
  /** Mark that auto-follow should begin (call when generation starts) */
  startFollowing: () => void;
  /** Stop following (call when generation completes) */
  stopFollowing: () => void;
}

/**
 * Intelligent scroll controller for AI chat.
 *
 * States:
 * - following: auto-scrolling with new content
 * - near_bottom: user is close to bottom, will resume following
 * - user_scrolling: user actively scrolled up
 * - detached: user is reading old messages
 */
export function useChatScroll(): UseChatScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>('following');
  const isGeneratingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const throttleRef = useRef<number | null>(null);
  const userScrolledRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const handleScroll = useCallback(() => {
    if (throttleRef.current !== null) return;

    throttleRef.current = requestAnimationFrame(() => {
      throttleRef.current = null;
      const el = containerRef.current;
      if (!el) return;

      const currentScrollTop = el.scrollTop;
      const scrolledUp = currentScrollTop < lastScrollTopRef.current - 5;
      lastScrollTopRef.current = currentScrollTop;

      if (scrolledUp && isGeneratingRef.current) {
        // User scrolled upward during generation — detach
        userScrolledRef.current = true;
        setScrollState('detached');
      } else if (isNearBottom()) {
        // User is near bottom — resume following if generating
        if (isGeneratingRef.current) {
          userScrolledRef.current = false;
          setScrollState('following');
        } else {
          setScrollState('near_bottom');
        }
      } else if (userScrolledRef.current) {
        setScrollState('detached');
      }
    });
  }, [isNearBottom]);

  /** Smoothly follow latest content — call on streaming updates */
  const followLatest = useCallback(() => {
    if (userScrolledRef.current) return; // Don't fight user if they actively scrolled up
    const el = containerRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      lastScrollTopRef.current = el.scrollTop;
    });
  }, []);

  /** Jump to latest and resume auto-follow */
  const scrollToLatest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    userScrolledRef.current = false;
    isGeneratingRef.current = true;
    setScrollState('following');
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      lastScrollTopRef.current = el.scrollHeight;
    });
  }, []);

  /** Anchor the viewport around a specific element (e.g. user message after send) */
  const anchorToElement = useCallback((el: HTMLElement | null) => {
    if (!el || !containerRef.current) return;
    requestAnimationFrame(() => {
      // Position the element roughly 1/3 from the top of the viewport
      const container = containerRef.current;
      if (!container) return;
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + container.scrollTop;
      const targetScroll = offset - container.clientHeight * 0.3;
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      lastScrollTopRef.current = container.scrollTop;
    });
  }, []);

  const startFollowing = useCallback(() => {
    isGeneratingRef.current = true;
    userScrolledRef.current = false;
    setScrollState('following');
  }, []);

  const stopFollowing = useCallback(() => {
    isGeneratingRef.current = false;
    if (isNearBottom()) {
      setScrollState('near_bottom');
    }
  }, [isNearBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (throttleRef.current !== null) {
        cancelAnimationFrame(throttleRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    scrollState,
    isDetached: scrollState === 'detached' || scrollState === 'user_scrolling',
    handleScroll,
    followLatest,
    scrollToLatest,
    anchorToElement,
    startFollowing,
    stopFollowing,
  };
}
