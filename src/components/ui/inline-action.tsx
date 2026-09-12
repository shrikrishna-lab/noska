'use client';

import React, { useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface InlineActionProps {
  label: string;
  icon: React.ReactNode;
  actionText: string;
  onAction: () => Promise<void> | void;
  theme?: 'light' | 'dark' | 'system';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineAction: React.FC<InlineActionProps> = ({
  label,
  icon,
  actionText,
  onAction,
  theme = 'system',
  size = 'sm',
  className,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleTrigger = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await onAction();
      setStatus('success');
    } catch {
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const springTransition: Transition = {
    type: 'spring',
    stiffness: 440,
    damping: 32,
    mass: 0.8,
  };

  const forcedTheme =
    theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : '';

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  // Dynamic dimension metrics based on size variant
  const containerClass = isSmall
    ? 'h-8 sm:h-8.5 rounded-full border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#181b24] p-1 pl-2 pr-1 shadow-2xs gap-2'
    : isLarge
    ? 'h-12 w-full max-w-sm rounded-full border-[1.5px] border-[#F0F0F0] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 pl-3.5 pr-2.5 shadow-sm gap-3'
    : 'h-9.5 rounded-full border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#181b24] p-1.5 pl-3 pr-1.5 shadow-2xs gap-2.5';

  const iconContainerClass = isSmall
    ? 'size-5.5 sm:size-6 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#1c1b18] dark:text-zinc-100 flex items-center justify-center p-1'
    : isLarge
    ? 'size-8 rounded-full bg-[#F0F0F0] dark:bg-zinc-800 text-[#1F1F1F] dark:text-zinc-100 flex items-center justify-center p-1.5'
    : 'size-6.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#1c1b18] dark:text-zinc-100 flex items-center justify-center p-1.5';

  const labelClass = isSmall
    ? 'truncate text-xs font-semibold text-[#1c1b18] dark:text-white tracking-tight'
    : isLarge
    ? 'truncate text-[15px] sm:text-[17px] font-bold text-[#000000] dark:text-white'
    : 'truncate text-xs sm:text-sm font-semibold text-[#1c1b18] dark:text-white tracking-tight';

  const actionBoxClass = isSmall
    ? 'h-6 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.07] dark:hover:bg-white/[0.12] transition-colors'
    : isLarge
    ? 'h-8.5 rounded-full bg-[#F0F0F0] hover:bg-[#E5E5E5] dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors'
    : 'h-7 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.07] dark:hover:bg-white/[0.12] transition-colors';

  const idleWidth = isSmall ? 70 : isLarge ? 110 : 84;
  const loadingWidth = isSmall ? 68 : isLarge ? 110 : 80;
  const successWidth = isSmall ? 24 : isLarge ? 34 : 28;

  const btnTextClass = isSmall
    ? 'text-[11px] font-semibold text-[#1c1b18] dark:text-white px-2'
    : isLarge
    ? 'text-[13px] sm:text-[14px] font-bold text-[#000000] dark:text-white px-3'
    : 'text-xs font-semibold text-[#1c1b18] dark:text-white px-2.5';

  const checkIconSize = isSmall ? 13 : isLarge ? 18 : 15;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        forcedTheme,
        className,
      )}
    >
      <div className={cn('flex items-center justify-between overflow-hidden transition-colors duration-200', containerClass)}>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className={iconContainerClass}>
            <div className="flex items-center justify-center [&_svg]:size-3.5 sm:[&_svg]:size-3.5">{icon}</div>
          </div>
          <span className={labelClass}>
            {label}
          </span>
        </div>

        <MotionConfig transition={springTransition}>
          <motion.div
            className={cn('relative flex items-center justify-center overflow-hidden', actionBoxClass)}
            animate={{
              width:
                status === 'success'
                  ? successWidth
                  : status === 'loading'
                  ? loadingWidth
                  : idleWidth,
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {status === 'idle' && (
                <motion.button
                  key="idle"
                  type="button"
                  initial={{ opacity: 0, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(3px)' }}
                  onClick={handleTrigger}
                  className={cn('w-full h-full cursor-pointer flex items-center justify-center whitespace-nowrap select-none', btnTextClass)}
                >
                  {actionText}
                </motion.button>
              )}

              {status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(3px)' }}
                  className="w-full flex items-center justify-center px-2"
                >
                  <div className="relative h-1.5 w-full rounded-full bg-black/10 dark:bg-white/20 overflow-hidden">
                    <motion.div
                      className="absolute top-0 bottom-0 w-[40%] rounded-full bg-[#1c1b18] dark:bg-white"
                      initial={{ left: '-40%' }}
                      animate={{ left: '100%' }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ filter: 'blur(3px)', opacity: 0, scale: 0.8 }}
                  animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}
                  exit={{ filter: 'blur(3px)', opacity: 0, scale: 0.8 }}
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-white shadow-2xs"
                >
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
                    className="absolute inset-0 z-10 h-full w-full skew-x-[-30deg] bg-linear-to-r from-transparent via-white/40 to-transparent"
                  />
                  <Check size={checkIconSize} strokeWidth={2.5} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </MotionConfig>
      </div>
    </div>
  );
};

export default InlineAction;
