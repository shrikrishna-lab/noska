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

export interface InlineActionBaseProps {
  label: string;
  icon: React.ReactNode;
  actionText: string;
  onAction: () => Promise<void> | void;
  theme?: 'light' | 'dark' | 'system';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineActionBase: React.FC<InlineActionBaseProps> = ({
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

  const containerClass = isSmall
    ? 'h-8 sm:h-8.5 rounded-lg border border-border/60 bg-card p-1 pl-2 pr-1 shadow-2xs gap-2'
    : isLarge
    ? 'h-12 w-full max-w-sm rounded-lg border border-border/60 bg-card p-2.5 pl-3.5 pr-2.5 shadow-sm gap-3'
    : 'h-9.5 rounded-lg border border-border/60 bg-card p-1.5 pl-3 pr-1.5 shadow-2xs gap-2.5';

  const iconContainerClass = isSmall
    ? 'size-5.5 sm:size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center p-1'
    : isLarge
    ? 'size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center p-1.5'
    : 'size-6.5 rounded-md bg-primary text-primary-foreground flex items-center justify-center p-1.5';

  const labelClass = isSmall
    ? 'truncate text-xs font-semibold text-card-foreground tracking-tight'
    : isLarge
    ? 'truncate text-[15px] sm:text-[17px] font-bold text-card-foreground'
    : 'truncate text-xs sm:text-sm font-semibold text-card-foreground tracking-tight';

  const actionBoxClass = isSmall
    ? 'h-6 rounded-md bg-primary text-primary-foreground transition-colors'
    : isLarge
    ? 'h-8.5 rounded-lg bg-primary text-primary-foreground transition-colors'
    : 'h-7 rounded-md bg-primary text-primary-foreground transition-colors';

  const idleWidth = isSmall ? 70 : isLarge ? 110 : 84;
  const loadingWidth = isSmall ? 68 : isLarge ? 110 : 80;
  const successWidth = isSmall ? 24 : isLarge ? 34 : 28;

  const btnTextClass = isSmall
    ? 'text-[11px] font-semibold px-2'
    : isLarge
    ? 'text-[13px] sm:text-[14px] font-bold px-3'
    : 'text-xs font-semibold px-2.5';

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
                  <div className="bg-primary-foreground/20 relative h-1.5 w-full rounded-full overflow-hidden">
                    <motion.div
                      className="bg-primary-foreground absolute top-0 bottom-0 w-[40%] rounded-full"
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
                  className="bg-primary-foreground text-primary relative flex h-full w-full items-center justify-center overflow-hidden rounded-md"
                >
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
                    className="via-primary/30 absolute inset-0 z-10 h-full w-full skew-x-[-30deg] bg-linear-to-r from-transparent to-transparent"
                  />
                  <Check size={checkIconSize} strokeWidth={2.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </MotionConfig>
      </div>
    </div>
  );
};

export default InlineActionBase;
