'use client';

import React, { useState, useMemo, type FC, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AiModelEffort } from './ai-prompt-input';

export interface ColorSettings {
  text: string;
  gradient: string;
  thumbBorder: string;
}

export interface AdaptiveSliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  label?: string;
  unit?: string;
  className?: string;
  colorSettingsFn?: (value: number, min: number, max: number) => ColorSettings;
  dotsCount?: number;
}

const DEFAULT_MIN = 50;
const DEFAULT_MAX = 350;
const DEFAULT_STEP = 25;
const DEFAULT_VALUE = 200;

export const defaultGetColorSettings = (
  value: number,
  min: number,
  max: number,
): ColorSettings => {
  const percentage = (value - min) / (max - min || 1);

  if (percentage < 0.5) {
    return {
      text: '#10B981',
      gradient: 'linear-gradient(to right, #FEB101, #FE7C09)',
      thumbBorder: '#10B981',
    };
  } else if (percentage < 0.7) {
    return {
      text: '#FE55B7',
      gradient: 'linear-gradient(to right, #FE55B74D, #FE55B7)',
      thumbBorder: '#F97316',
    };
  } else {
    return {
      text: '#D946EF',
      gradient: 'linear-gradient(to right, #DAB0FE, #4946FF)',
      thumbBorder: '#D946EF',
    };
  }
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
        'flex text-lg tracking-tight will-change-transform',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {value.split('').map((char, index) => {
          const displayChar = char === ' ' ? '\u00A0' : char;

          return (
            <motion.span
              key={char + index}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                },
              }}
              exit={{ opacity: 0, y: 0, scale: 1, transition: { duration: 0 } }}
            >
              {displayChar}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export const AdaptiveSlider: FC<AdaptiveSliderProps> = ({
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  defaultValue = DEFAULT_VALUE,
  onChange,
  label = 'Calories',
  unit = 'kCal',
  className,
  colorSettingsFn = defaultGetColorSettings,
  dotsCount = 6,
}) => {
  const [internalValue, setInternalValue] = useState<number>(defaultValue);

  const calories = value ?? internalValue;

  const colorSettings = useMemo(
    () => colorSettingsFn(calories, min, max),
    [calories, min, max, colorSettingsFn],
  );

  const percentage = Math.min(100, Math.max(0, ((calories - min) / (max - min || 1)) * 100));

  const dots = useMemo(
    () =>
      Array.from({ length: dotsCount }).map((_, i) => (
        <div
          key={i}
          className="z-30 h-1.5 w-1.5 rounded-full bg-[#C4B9FA] transition-colors dark:bg-neutral-600"
          style={{ opacity: 0.8 }}
        />
      )),
    [dotsCount],
  );

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setInternalValue(val);
    onChange?.(val);
  };

  return (
    <motion.div
      className={cn(
        "flex h-[60vh] w-xs flex-col items-center justify-center rounded-[36px] bg-[#FEFEFE] p-6 shadow-2xl shadow-black/5 transition-colors select-none sm:w-sm sm:p-12 dark:bg-neutral-900 dark:shadow-none",
        className
      )}
    >
      <span className="mb-2 text-xl font-bold text-[#878787] sm:text-2xl dark:text-neutral-500">
        {label}
      </span>

      <div className="mb-8 flex items-baseline gap-2">
        <AnimatedText
          value={calories.toString()}
          className="overflow-hidden text-5xl font-extrabold tracking-tight sm:text-6xl"
        />
        <motion.span
          layout
          className="text-4xl font-extrabold text-[#010101] transition-colors sm:text-5xl dark:text-neutral-100"
        >
          {unit}
        </motion.span>
      </div>

      <div className="group relative flex h-13 w-full items-center overflow-hidden rounded-full bg-[#f1f3f5] transition-colors dark:bg-neutral-800">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4 transition-colors sm:px-8">
          {dots}
        </div>

        <motion.div
          className="pointer-events-none absolute top-0 left-0 h-full rounded-full"
          animate={{
            width: `calc((${percentage} / 100) * (100% - 52px) + 52px)`,
            background: colorSettings.gradient,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        <input
          title={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={calories}
          onChange={handleSliderChange}
          className="absolute inset-0 z-50 h-13 w-full cursor-pointer opacity-0"
        />

        <motion.div
          className="pointer-events-none absolute top-0 z-40 flex size-13 items-center justify-center rounded-full border-none"
          animate={{
            left: `calc((${percentage} / 100) * (100% - 52px))`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="size-10 rounded-full bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]" />
        </motion.div>
      </div>
    </motion.div>
  );
};

export interface AdaptiveReasoningSliderProps {
  effort?: AiModelEffort;
  onEffortChange?: (effort: AiModelEffort) => void;
  className?: string;
  showPresets?: boolean;
}

export const getReasoningColorSettings = (percentage: number): ColorSettings => {
  if (percentage < 0.4) {
    return {
      text: '#10B981',
      gradient: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
      thumbBorder: '#10B981',
    };
  } else if (percentage < 0.75) {
    return {
      text: '#F59E0B',
      gradient: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
      thumbBorder: '#F59E0B',
    };
  } else {
    return {
      text: '#8B5CF6',
      gradient: 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%)',
      thumbBorder: '#8B5CF6',
    };
  }
};

/**
 * Compact AI Reasoning Slider tuned for prompt input headers and side panels.
 */
export const AdaptiveReasoningSlider: FC<AdaptiveReasoningSliderProps> = ({
  effort = 'medium',
  onEffortChange,
  className,
  showPresets = true,
}) => {
  const effortToNum = (eff: AiModelEffort): number => {
    switch (eff) {
      case 'low':
        return 20;
      case 'high':
        return 90;
      case 'medium':
      default:
        return 55;
    }
  };

  const numToEffort = (num: number): AiModelEffort => {
    if (num < 36) return 'low';
    if (num > 70) return 'high';
    return 'medium';
  };

  const [val, setVal] = useState<number>(effortToNum(effort));

  React.useEffect(() => {
    setVal(effortToNum(effort));
  }, [effort]);

  const currentEffort = numToEffort(val);
  const percentage = val;
  const colorSettings = useMemo(() => getReasoningColorSettings(percentage / 100), [percentage]);

  const label =
    currentEffort === 'low'
      ? 'Fast / Low Effort'
      : currentEffort === 'medium'
      ? 'Balanced Reasoning'
      : 'Deep Thinking';

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextVal = Number(e.target.value);
    setVal(nextVal);
    const nextEffort = numToEffort(nextVal);
    if (nextEffort !== effort) {
      onEffortChange?.(nextEffort);
    }
  };

  const handlePresetClick = (eff: AiModelEffort, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetNum = effortToNum(eff);
    setVal(targetNum);
    onEffortChange?.(eff);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-2.5 rounded-xl bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.06] dark:border-white/[0.07] select-none",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full transition-colors duration-300 shadow-xs"
            style={{ backgroundColor: colorSettings.text }}
          />
          <span className="font-semibold capitalize text-foreground">
            {currentEffort}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {label}
        </span>
      </div>

      <div className="group relative flex h-7 w-full items-center overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-colors">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="z-20 size-1 rounded-full bg-black/15 dark:bg-white/20 transition-colors"
            />
          ))}
        </div>

        <motion.div
          className="pointer-events-none absolute top-0 left-0 h-full rounded-full shadow-xs"
          animate={{
            width: `calc((${percentage} / 100) * (100% - 28px) + 28px)`,
            background: colorSettings.gradient,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        />

        <input
          title="Reasoning Effort"
          type="range"
          min={0}
          max={100}
          step={5}
          value={val}
          onChange={handleSliderChange}
          className="absolute inset-0 z-40 h-7 w-full cursor-pointer opacity-0"
        />

        <motion.div
          className="pointer-events-none absolute top-0 z-30 flex size-7 items-center justify-center rounded-full border-none"
          animate={{
            left: `calc((${percentage} / 100) * (100% - 28px))`,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div className="size-5 rounded-full bg-white dark:bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] flex items-center justify-center">
            <div
              className="size-2 rounded-full transition-colors duration-200 shadow-2xs"
              style={{ backgroundColor: colorSettings.text }}
            />
          </div>
        </motion.div>
      </div>

      {showPresets && (
        <div className="grid grid-cols-3 gap-1 pt-0.5 bg-black/[0.03] dark:bg-white/[0.04] p-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05]">
          {(['low', 'medium', 'high'] as const).map((eff) => {
            const isEffortActive = currentEffort === eff;
            return (
              <button
                key={eff}
                type="button"
                onClick={(e) => handlePresetClick(eff, e)}
                className={cn(
                  "py-1 text-[10px] rounded-md transition-all font-medium text-center cursor-pointer select-none",
                  isEffortActive
                    ? "bg-white dark:bg-[#27272a] text-foreground font-semibold shadow-xs border border-black/5 dark:border-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                {eff === 'low' ? 'Low' : eff === 'medium' ? 'Medium' : 'High'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdaptiveSlider;
