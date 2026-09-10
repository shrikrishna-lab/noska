import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollabCursorData {
  userId?: string;
  userName?: string;
  userColor?: string;
  x?: number;
  y?: number;
  isTyping?: boolean;
}

interface CollabCursorLayerProps {
  cursors: Record<string, CollabCursorData>;
  containerRef?: React.RefObject<HTMLElement | null>;
}

const CursorBadge = memo(function CursorBadge({ cursor }: { cursor: CollabCursorData }) {
  const color = cursor.userColor || '#0066FF';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="absolute left-3.5 top-1 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-tight whitespace-nowrap pointer-events-none shadow-[0_4px_12px_rgba(0,0,0,0.18)] backdrop-blur-md select-none border border-white/30"
      style={{
        backgroundColor: color,
        color: '#ffffff'
      }}
    >
      <span>{cursor.userName || 'Anonymous'}</span>
      {cursor.isTyping && (
        <span className="flex items-center gap-0.5 ml-0.5">
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      )}
    </motion.div>
  );
});

const CursorSVG = memo(function CursorSVG({ color }: { color?: string }) {
  const fill = color || '#0066FF';
  return (
    <svg
      width="18"
      height="22"
      viewBox="0 0 18 22"
      fill="none"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] select-none pointer-events-none"
    >
      <path
        d="M1.5 1.5L14.5 13.5H7.5L5 20.5L1.5 1.5Z"
        fill={fill}
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
});

export default function CollabCursorLayer({ cursors }: CollabCursorLayerProps) {
  const keys = Object.keys(cursors || {});
  if (keys.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[100] overflow-hidden select-none"
      style={{ isolation: 'isolate' }}
    >
      <AnimatePresence>
        {keys.map((uid) => {
          const cursor = cursors[uid];
          if (!cursor || cursor.x === undefined || cursor.y === undefined) return null;
          return (
            <motion.div
              key={uid}
              className="absolute top-0 left-0 pointer-events-none"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                x: cursor.x,
                y: cursor.y,
                opacity: 1,
                scale: 1
              }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                x: { type: 'spring', stiffness: 450, damping: 32, mass: 0.3 },
                y: { type: 'spring', stiffness: 450, damping: 32, mass: 0.3 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
            >
              <div className="relative">
                <CursorSVG color={cursor.userColor} />
                <CursorBadge cursor={cursor} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
