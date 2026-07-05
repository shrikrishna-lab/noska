import { useState, useEffect, useRef, useCallback } from 'react';
import { realtimeCollab } from '../lib/realtimeCollab';

const CURSOR_EXPIRY = 5000;
const THROTTLE_MS = 50;

export function useCursor(pageId) {
  const [cursors, setCursors] = useState({});
  const cursorsRef = useRef({});
  const animFrames = useRef({});
  const lastSend = useRef(0);
  const pageRef = useRef(pageId);
  pageRef.current = pageId;

  const lerp = (a, b, t) => a + (b - a) * t;

  const animateCursor = (userId, target) => {
    if (animFrames.current[userId]) {
      cancelAnimationFrame(animFrames.current[userId]);
    }
    const start = cursorsRef.current[userId] || { x: target.x, y: target.y };
    const startTime = performance.now();
    const duration = 120;

    const step = (now) => {
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
    if (!pageId || !realtimeCollab.isJoined()) return;

    const cleanup = realtimeCollab.on('cursor:move', ({ pageId: pid, ...data }) => {
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
      clearInterval(expiryInterval);
      Object.values(animFrames.current).forEach(cancelAnimationFrame);
      animFrames.current = {};
      cursorsRef.current = {};
    };
  }, [pageId]);

  const handleMouseMove = useCallback((e) => {
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
  }, []);

  return { cursors, handleMouseMove };
}
