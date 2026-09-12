'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, type FC } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  MotionConfig,
} from 'motion/react';
import { ChevronDown, Globe } from 'lucide-react';
import { TbLockFilled } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/utils';

export interface Option {
  id: string;
  label: string;
  icon: IconType | React.ComponentType<{ size?: number; className?: string }>;
}

export interface OptionPickerProps {
  options?: Option[];
  value?: string;
  onChange?: (optionId: string) => void;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'xs';
  className?: string;
  dropdownPlacement?: 'top' | 'bottom';
}

const DEFAULT_OPTIONS: Option[] = [
  { id: 'private', label: 'Private', icon: TbLockFilled },
  { id: 'public', label: 'Public', icon: Globe },
];

export const OptionPicker: FC<OptionPickerProps> = ({
  options = DEFAULT_OPTIONS,
  value,
  onChange,
  disabled = false,
  size = 'default',
  className,
  dropdownPlacement = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  const data = options.length > 0 ? options : DEFAULT_OPTIONS;
  const currentSelected = data.find((o) => o.id === value) || data[0];
  const [internalSelected, setInternalSelected] = useState<Option>(currentSelected);

  const selected = value ? currentSelected : internalSelected;
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const preferBottom = dropdownPlacement === 'bottom' || rect.top < 140;

      if (preferBottom) {
        setCoords({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
          placement: 'bottom',
        });
      } else {
        setCoords({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
          placement: 'top',
        });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, dropdownPlacement]);

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (option: Option) => {
    setInternalSelected(option);
    onChange?.(option.id);
    setIsOpen(false);
  };

  const isSmall = size === 'sm' || size === 'xs';

  return (
    <div
      className={cn("relative inline-block", className)}
      ref={containerRef}
    >
      <MotionConfig
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <motion.button
          type="button"
          layout="size"
          disabled={disabled}
          onClick={toggleOpen}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          title="Change Visibility"
          aria-label={`Visibility is currently ${selected.label}. Click to change.`}
          aria-expanded={isOpen}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full border border-transparent transition-all duration-300 select-none cursor-pointer",
            isSmall ? "px-2.5 py-1 text-xs" : "px-4 py-3 text-sm",
            disabled && "cursor-default opacity-70 pointer-events-none",
            isOpen
              ? "bg-[#E5E5E5] text-[#1c1b18] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              : "bg-[#F4F4F4] text-[#1c1b18] hover:bg-[#EBEBEB] dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              className="flex items-center gap-1.5"
            >
              <selected.icon
                size={isSmall ? 13 : 18}
                className={cn(
                  "transition-colors duration-300",
                  isOpen ? "text-[#4A4A4A] dark:text-neutral-300" : "text-[#7A7A7A] dark:text-neutral-400"
                )}
              />
            </motion.div>
          </AnimatePresence>
          <AnimatedText
            value={selected.label}
            className={cn(
              "font-semibold text-neutral-800 dark:text-neutral-100",
              isSmall ? "text-xs" : "text-sm"
            )}
          />

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="flex items-center"
          >
            <ChevronDown
              size={isSmall ? 11 : 16}
              className={cn(
                "transition-colors duration-300",
                isOpen ? "text-[#4A4A4A] dark:text-neutral-300" : "text-[#7A7A7A] dark:text-neutral-400"
              )}
              strokeWidth={2.5}
            />
          </motion.div>
        </motion.button>

        {mounted && isOpen && coords && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              zIndex: 99999,
            }}
            className="select-none"
          >
            <AnimatePresence>
              <motion.div
                initial={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 8 : -8,
                  filter: 'blur(4px)',
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: coords.placement === 'top' ? 8 : -8,
                  filter: 'blur(4px)',
                  scale: 0.95,
                }}
                transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                role="menu"
                aria-label="Visibility options"
              >
                <div className="relative flex min-w-max gap-1.5 rounded-full border border-neutral-200/80 bg-[#F3F3F3] p-1.5 py-1 shadow-2xl whitespace-nowrap dark:border-neutral-700 dark:bg-neutral-800">
                  {data.map((option, index) => {
                    const isActive = selected.id === option.id;
                    const isFirst = index === 0;
                    const isLast = index === data.length - 1;

                    const roundedClasses = `
                      ${isFirst ? 'rounded-l-full rounded-r-2xl' : ''}
                      ${isLast ? 'rounded-r-full rounded-l-2xl' : ''}
                      ${!isFirst && !isLast ? 'rounded-none' : ''}
                    `;

                    const IconComp = option.icon;

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(option)}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ y: -1 }}
                        title={`Set as ${option.label}`}
                        aria-label={`Select ${option.label}`}
                        className={cn(
                          "relative flex items-center gap-2 font-semibold transition-all duration-200 cursor-pointer",
                          isSmall ? "px-3 py-1.5 text-[12px]" : "px-4 py-2.5 text-[14px]",
                          roundedClasses,
                          isActive
                            ? "bg-[#FEFEFE] text-[#010101] shadow-sm dark:bg-neutral-700 dark:text-white"
                            : "bg-transparent text-[#6E6E6E] hover:text-[#1c1b18] dark:text-neutral-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                        )}
                      >
                        <motion.span className="shrink-0 flex items-center">
                          <IconComp size={isSmall ? 14 : 18} />
                        </motion.span>
                        <span className="font-semibold relative z-10">
                          {option.label}
                        </span>
                      </motion.button>
                    );
                  })}

                  <div
                    className={cn(
                      "absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-neutral-200/80 bg-[#F3F3F3] dark:border-neutral-700 dark:bg-neutral-800",
                      coords.placement === 'top'
                        ? "-bottom-1 border-r border-b"
                        : "-top-1 border-l border-t"
                    )}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}
      </MotionConfig>
    </div>
  );
};

export const AnimatedText = ({
  value,
  className,
}: {
  value: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex tracking-tight will-change-transform',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {value.split('').map((char, index) => {
          const displayChar = char === ' ' ? '\u00A0' : char;

          return (
            <motion.span
              key={char + index}
              layout
              initial={{ opacity: 0, y: 5, scale: 0.7 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 0.02 * index,
                },
              }}
              exit={{ opacity: 0, y: -5, scale: 0.7 }}
            >
              {displayChar}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default OptionPicker;
