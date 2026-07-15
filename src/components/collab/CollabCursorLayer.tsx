import React from 'react';
import { motion } from 'framer-motion';

function CursorBadge({ cursor }) {
  return (
    <span
      className="absolute left-3 top-0 rounded px-1 py-0.5 text-[9px] font-medium whitespace-nowrap pointer-events-none"
      style={{ backgroundColor: cursor.userColor, color: '#fff' }}
    >
      {cursor.userName}
    </span>
  );
}

function CursorSVG({ color }) {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path d="M0 0L10 10H5L3 16L0 0Z" fill={color} opacity="0.85" />
    </svg>
  );
}

export default function CollabCursorLayer({ cursors, containerRef }) {
  const keys = Object.keys(cursors);
  if (keys.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden" style={{ isolation: 'isolate' }}>
      {keys.map((uid) => {
        const cursor = cursors[uid];
        if (!cursor || cursor.x === undefined || cursor.y === undefined) return null;
        return (
          <motion.div
            key={uid}
            className="absolute top-0 left-0"
            style={{ x: cursor.x, y: cursor.y }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
          >
            <div className="relative">
              <CursorSVG color={cursor.userColor} />
              <CursorBadge cursor={cursor} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
