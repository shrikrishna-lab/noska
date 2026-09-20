import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { realtimeCollab } from '../lib/realtimeCollab';

const CURSOR_EXPIRY = 5000;
const THROTTLE_MS = 50;

export interface CursorEntry {
  x: number;
  y: number;
  userName?: string;
  userAvatar?: string;
  userColor?: string;
  targetBlockId?: string | null;
  lastSeen: number;
}

export type CursorMap = Record<string, CursorEntry>;

interface CursorMoveTarget {
  x: number;
  y: number;
  userName?: string;
  userAvatar?: string;
  userColor?: string;
  targetBlockId?: string | null;
}

export function useCursor(pageId: string | null | undefined, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [cursors, setCursors] = useState<CursorMap>({});
  const cursorsRef = useRef<CursorMap>({});
  const animFrames = useRef<Record<string, number>>({});
  const lastSend = useRef(0);
  const pageRef = useRef(pageId);
  pageRef.current = pageId;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const animateCursor = (userId: string, target: CursorMoveTarget) => {
    if (animFrames.current[userId]) {
      cancelAnimationFrame(animFrames.current[userId]);
    }
    const start = cursorsRef.current[userId] || { x: target.x, y: target.y };
    const startTime = performance.now();
    const duration = 120;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const x = lerp(start.x, target.x, ease);
      const y = lerp(start.y, target.y, ease);

      cursorsRef.current[userId] = {
        ...cursorsRef.current[userId],
        x, y,
        userName: target.userName,
        userAvatar: target.userAvatar,
        userColor: target.userColor,
        targetBlockId: target.targetBlockId,
        lastSeen: Date.now()
      };

      if (t < 1) {
        animFrames.current[userId] = requestAnimationFrame(step);
      } else {
        cursorsRef.current[userId] = {
          ...cursorsRef.current[userId],
          x: target.x,
          y: target.y,
          lastSeen: Date.now()
        };
      }

      setCursors({ ...cursorsRef.current });
    };

    animFrames.current[userId] = requestAnimationFrame(step);
  };

  useEffect(() => {
    // `enabled: false` (e.g. private page) → no cursor channel join and no
    // sends, so remote users never see this page's cursors.
    setCursors({});
    lastSend.current = 0;
    if (!pageId || !enabled || !realtimeCollab.isJoined()) return;

    const cleanup = realtimeCollab.on('cursor:move', ({ pageId: pid, ...data }: { pageId: string; userId?: string } & CursorMoveTarget) => {
      if (pid !== pageRef.current) return;
      const { userId, x, y, userName, userAvatar, userColor, targetBlockId } = data;
      if (!userId) return;
      animateCursor(userId, { x, y, userName, userAvatar, userColor, targetBlockId });
    });

    realtimeCollab.joinPage(pageId);

    const expiryInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const uid of Object.keys(cursorsRef.current)) {
        if (now - cursorsRef.current[uid].lastSeen > CURSOR_EXPIRY) {
          delete cursorsRef.current[uid];
          changed = true;
        }
      }
      if (changed) setCursors({ ...cursorsRef.current });
    }, 2000);

    return () => {
      cleanup();
      realtimeCollab.leavePage(pageId);
      clearInterval(expiryInterval);
      Object.values(animFrames.current).forEach(cancelAnimationFrame);
      animFrames.current = {};
      cursorsRef.current = {};
    };
  }, [pageId, enabled]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!enabled || !pageRef.current) return;
    const now = Date.now();
    if (now - lastSend.current < THROTTLE_MS) return;
    lastSend.current = now;
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    realtimeCollab.sendCursor(
      pageRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top,
      null
    );
  }, [enabled]);

  return { cursors, handleMouseMove };
}
