'use client';

import React, { useState, useRef, useEffect, type FC } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
} from 'motion/react';
import { ChevronDown, Globe } from 'lucide-react';
import { TbLockFilled } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/utils';
import { AnimatedText, type Option } from './quick-option-picker';

export interface OptionPickerBaseProps {
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

export const OptionPickerBase: FC<OptionPickerBaseProps> = ({
  options = DEFAULT_OPTIONS,
  value,
  onChange,
  disabled = false,
  size = 'default',
  className,
  dropdownPlacement = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const data = options.length > 0 ? options : DEFAULT_OPTIONS;
  const currentSelected = data.find((o) => o.id === value) || data[0];
  const [internalSelected, setInternalSelected] = useState<Option>(currentSelected);

  const selected = value ? currentSelected : internalSelected;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      className={cn("theme-injected relative inline-block perspective-[1200px] transform-3d", className)}
      ref={containerRef}
    >
      <MotionConfig
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{
                opacity: 0,
                y: dropdownPlacement === 'top' ? 10 : -10,
                filter: 'blur(4px)',
                scale: 1.05,
                rotateX: dropdownPlacement === 'top' ? -70 : 70,
              }}
              animate={{
                opacity: 1,
                y: dropdownPlacement === 'top' ? -5 : 5,
                filter: 'blur(0px)',
                scale: 1,
                rotateX: 0,
              }}
              exit={{
                opacity: 0,
                y: dropdownPlacement === 'top' ? 10 : -10,
                filter: 'blur(4px)',
                scale: 1.05,
                rotateX: dropdownPlacement === 'top' ? -70 : 70,
              }}
              className={cn(
                "absolute left-1/2 z-50 origin-bottom -translate-x-1/2 transform-3d",
                dropdownPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
              )}
              role="menu"
              aria-label="Visibility options"
            >
              <div className="relative flex min-w-max gap-2 rounded-lg border border-border bg-muted p-1.5 py-1 whitespace-nowrap shadow-xl">
                {data.map((option, index) => {
                  const isActive = selected.id === option.id;
                  const isFirst = index === 0;
                  const isLast = index === data.length - 1;

                  const roundedClasses = `
                    ${isFirst ? 'rounded-l-lg rounded-r-lg' : ''}
                    ${isLast ? 'rounded-r-lg rounded-l-lg' : ''}
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
                        "relative flex items-center gap-2 font-semibold transition-all duration-300 cursor-pointer",
                        isSmall ? "px-3 py-1.5 text-[12px]" : "px-4 py-2.5 text-[14px]",
                        roundedClasses,
                        isActive
                          ? "bg-background text-foreground shadow-2xs"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <motion.span className="shrink-0 flex items-center">
                        <IconComp size={isSmall ? 15 : 18} />
                      </motion.span>
                      <span className="font-semibold relative z-10">
                        {option.label}
                      </span>
                    </motion.button>
                  );
                })}

                <div
                  className={cn(
                    "absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-border bg-muted",
                    dropdownPlacement === 'top'
                      ? "-bottom-1 border-r border-b"
                      : "-top-1 border-l border-t"
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            "flex items-center justify-center gap-1.5 rounded-lg border border-transparent transition-all duration-300 select-none cursor-pointer",
            isSmall ? "px-2.5 py-1 text-xs" : "px-4 py-3 text-sm",
            disabled && "cursor-default opacity-70 pointer-events-none",
            isOpen ? "bg-muted/50 border-border" : "bg-muted hover:bg-muted/80"
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
                size={isSmall ? 14 : 18}
                className="text-muted-foreground transition-colors duration-300"
              />
            </motion.div>
          </AnimatePresence>

          <AnimatedText
            value={selected.label}
            className={cn(
              "font-semibold text-foreground",
              isSmall ? "text-xs" : "text-sm"
            )}
          />

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="flex items-center"
          >
            <ChevronDown
              size={isSmall ? 12 : 16}
              className="text-muted-foreground transition-colors duration-300"
              strokeWidth={2.5}
            />
          </motion.div>
        </motion.button>
      </MotionConfig>
    </div>
  );
};

export default OptionPickerBase;
