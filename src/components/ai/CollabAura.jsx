import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AURA_COLORS = [
  ['#7c3aed', '#ec4899'],
  ['#06b6d4', '#f59e0b'],
  ['#10b981', '#6366f1'],
  ['#f97316', '#8b5cf6']
];

function Particle({ index, color1, color2 }) {
  const angle = (index / 12) * 360;
  const radius = 30 + Math.random() * 20;
  const size = 2 + Math.random() * 2.5;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color1}, ${color2})`,
        opacity: 0.5 + Math.random() * 0.4,
        filter: 'blur(0.5px)',
      }}
      animate={{
        x: [0, Math.cos(angle * Math.PI / 180) * radius * 0.4, Math.cos(angle * Math.PI / 180) * radius],
        y: [0, Math.sin(angle * Math.PI / 180) * radius * 0.4, Math.sin(angle * Math.PI / 180) * radius],
        scale: [0.6, 1.2, 0.6],
        opacity: [0.25, 0.7, 0.25],
      }}
      transition={{
        duration: 2.5 + Math.random() * 1.5,
        repeat: Infinity,
        delay: Math.random() * 1.5,
        ease: 'easeInOut',
      }}
    />
  );
}

function UserAura({ user }) {
  const colorPair = AURA_COLORS[Math.floor(Math.random() * AURA_COLORS.length)];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative"
    >
      {/* Aura particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <Particle key={i} index={i} color1={colorPair[0]} color2={colorPair[1]} />
        ))}
      </div>

      {/* User avatar */}
      <div
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-lg"
        style={{
          backgroundColor: user.userColor + '20',
          borderColor: user.userColor,
          color: user.userColor,
        }}
      >
        {user.userAvatar || user.userName?.[0] || '?'}
      </div>
    </motion.div>
  );
}

export default function CollabAura({ users = [], maxDisplay = 3 }) {
  if (!users || users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const remaining = users.length - maxDisplay;

  return (
    <div className="flex items-center -space-x-1.5">
      <AnimatePresence mode="popLayout">
        {displayUsers.map((user) => (
          <motion.div
            key={user.userId || user.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <UserAura user={user} />
          </motion.div>
        ))}
      </AnimatePresence>
      {remaining > 0 && (
        <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] border-2 border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--muted)] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  );
}
