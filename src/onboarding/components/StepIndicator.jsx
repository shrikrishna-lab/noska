import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const stepLabels = [
  "Welcome",
  "Personalize",
  "First Page",
  "Sidebar",
  "Blocks",
  "Databases",
  "Collaboration",
  "Templates",
  "Shortcuts",
  "Finish"
];

export default function StepIndicator({ current, total, showLabels = false }) {
  return (
    <div className="flex flex-col items-center gap-3" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i === current;
          const isPast = i < current;
          return (
            <motion.div
              key={i}
              layout
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isPast
                  ? "bg-[var(--noska-blue)] w-4"
                  : isActive
                  ? "bg-[var(--noska-blue)] w-8"
                  : "bg-[var(--border)] w-1.5"
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {showLabels && (
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
            {stepLabels[current] || `Step ${current + 1}`}
          </span>
        )}
        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
          {current + 1} / {total}
        </span>
      </div>
    </div>
  );
}
