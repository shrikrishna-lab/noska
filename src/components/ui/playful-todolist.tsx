'use client';

import * as React from 'react';
import { motion, type Transition } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const checkboxItems = [
  {
    id: 1,
    label: 'Code in Assembly 💾',
    defaultChecked: false,
  },
  {
    id: 2,
    label: 'Present a bug as a feature 🪲',
    defaultChecked: false,
  },
  {
    id: 3,
    label: 'Push to prod on a Friday 🚀',
    defaultChecked: false,
  },
];

const getPathAnimate = (isChecked: boolean) => ({
  pathLength: isChecked ? 1 : 0,
  opacity: isChecked ? 1 : 0,
});

const getPathTransition = (isChecked: boolean): Transition => ({
  pathLength: { duration: 1, ease: 'easeInOut' },
  opacity: {
    duration: 0.01,
    delay: isChecked ? 0 : 1,
  },
});

export const PlayfulTodoList = () => {
  const [checked, setChecked] = React.useState(
    checkboxItems.map((i) => !i.defaultChecked),
  );

  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-6 space-y-6">
      {checkboxItems.map((item, idx) => (
        <div key={item.id} className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              className="transition-colors duration-300"
              checked={checked[idx]}
              onCheckedChange={(val) => {
                const updated = [...checked];
                updated[idx] = val === true;
                setChecked(updated);
              }}
              id={`checkbox-${item.id}`}
            />
            <div className="relative inline-block">
              <Label htmlFor={`checkbox-${item.id}`}>{item.label}</Label>
              <motion.svg
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-20 w-full h-5"
              >
                <motion.path
                  d="M 2 10.5 C 45 7.5, 90 13.5, 145 10 C 200 6.5, 250 13, 298 9.5"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                  fill="none"
                  initial={false}
                  animate={getPathAnimate(!checked[idx])}
                  transition={getPathTransition(!checked[idx])}
                  className="stroke-neutral-900 dark:stroke-neutral-100"
                />
              </motion.svg>
            </div>
          </div>
          {idx !== checkboxItems.length - 1 && (
            <div className="border-t border-neutral-300 dark:border-neutral-700" />
          )}
        </div>
      ))}
    </div>
  );
};

export const Component = PlayfulTodoList;
export default PlayfulTodoList;
