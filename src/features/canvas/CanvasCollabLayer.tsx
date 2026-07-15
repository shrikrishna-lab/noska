import React from 'react';
import { motion } from 'framer-motion';
import type { CursorMap } from '../../hooks/useCursor';

interface CollabCursorProps {
  userId: string;
  x: number;
  y: number;
  userName?: string;
  userColor?: string;
  userAvatar?: string;
}

function CollabCursor({ userId, x, y, userName, userColor, userAvatar }: CollabCursorProps) {
  return (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{ top: 0, left: 0 }}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 250, damping: 20, mass: 0.8 }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
        <path d="M0 0L10 10H5L3 16L0 0Z" fill={userColor} opacity="0.85" />
      </svg>
      <span
        className="absolute left-3 top-0 rounded px-1 py-0.5 text-[9px] font-medium whitespace-nowrap"
        style={{ backgroundColor: userColor, color: '#fff' }}
      >
        {userName}
      </span>
    </motion.div>
  );
}

interface CanvasCollabLayerProps {
  cursors: CursorMap;
  canvasWidth?: number | string;
  canvasHeight?: number | string;
}

export default function CanvasCollabLayer({ cursors, canvasWidth, canvasHeight }: CanvasCollabLayerProps) {
  const entries = Object.entries(cursors).filter(([, c]) => c.x !== undefined && c.y !== undefined);

  if (entries.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: canvasWidth || '100%', height: canvasHeight || '100%' }}
    >
      {entries.map(([uid, cursor]) => (
        <CollabCursor
          key={uid}
          userId={uid}
          x={cursor.x}
          y={cursor.y}
          userName={cursor.userName}
          userColor={cursor.userColor}
          userAvatar={cursor.userAvatar}
        />
      ))}
    </div>
  );
}
