import React, { useEffect, useState } from 'react';
import { realtimeCollab } from '../../lib/realtimeCollab';

interface CursorData {
  x: number;
  y: number;
  userName: string;
  userColor: string;
  targetBlockId?: string | null;
}

interface CursorOverlayProps {
  pageId: string;
  className?: string;
}

export function CursorOverlay({ pageId, className }: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());

  useEffect(() => {
    const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

    const unsub = realtimeCollab.on('cursor:move', (data) => {
      if (data.pageId !== pageId) return;

      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          x: data.x,
          y: data.y,
          userName: (data as unknown as Record<string, unknown>).userName as string || '',
          userColor: (data as unknown as Record<string, unknown>).userColor as string || '#999',
          targetBlockId: data.targetBlockId,
        });
        return next;
      });

      const existing = timeouts.get(data.userId);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        timeouts.delete(data.userId);
      }, 10_000);
      timeouts.set(data.userId, timeout);
    });

    const removeUnsub = realtimeCollab.on('cursor:remove', (data) => {
      if (data.pageId !== pageId) return;
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    return () => {
      unsub();
      removeUnsub();
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [pageId]);

  if (cursors.size === 0) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 z-50 overflow-hidden ${className || ''}`}>
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <CursorRenderer key={userId} userId={userId} {...cursor} />
      ))}
    </div>
  );
}

function CursorRenderer({ userId, x, y, userName, userColor }: CursorData & { userId: string }) {
  return (
    <div
      className="absolute transition-all duration-100 ease-out"
      style={{ left: x, top: y, zIndex: 9999 }}
    >
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-lg">
        <path
          d="M0.928711 0.628906L14.9287 10.6289L7.42871 12.1289L3.92871 19.1289L0.928711 0.628906Z"
          fill={userColor}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: userColor }}
      >
        {userName || 'Anonymous'}
      </div>
    </div>
  );
}
