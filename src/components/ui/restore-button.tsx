"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

const TILE = 48;
const PANEL = 84;
const HOLD = { restored: 1400, cancelled: 600 };

const EASE = [0.32, 0.72, 0, 1] as const;
const WIDTH = { duration: 0.62, ease: EASE } as const;
const IN = { duration: 0.44, ease: EASE, delay: 0.14 } as const;
const OUT = { duration: 0.3, ease: EASE } as const;
const TAP = { duration: 0.2, ease: EASE } as const;
const SWAP = { duration: 0.22, ease: EASE } as const;
const SETTLE = { duration: 0.45, ease: EASE } as const;
const PRESS = {
  type: "spring",
  stiffness: 520,
  damping: 18,
  mass: 0.5,
} as const;
const INSTANT = { duration: 0 } as const;

const SURFACE = "bg-[#F4F4F9] dark:bg-[#262626]";
const RECESS = "bg-[#E7E7EF] dark:bg-[#1B1B1B]";
const GLYPH = "text-[#868593] dark:text-[#9B9AA7]";
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-[#868593]";
const ACCENT = "#10B981"; // Emerald green for restoration / recovery

const LIFT =
  "shadow-[0_0.5px_1px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.08),inset_0_0.5px_0_rgba(255,255,255,0.9)] dark:shadow-[0_0.5px_1px_rgba(0,0,0,0.35),0_1.5px_4px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.07)]";

const CIRCLE = `grid h-7 w-7 place-items-center rounded-full transition-colors duration-200 hover:bg-[#FAFAFD] dark:hover:bg-[#2C2C2C] ${FOCUS} ${SURFACE} ${LIFT}`;

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const panelMotion = {
  hidden: { opacity: 0, x: -6, transition: OUT },
  shown: { opacity: 1, x: 0, transition: { ...IN, staggerChildren: 0.07 } },
};

const circleMotion = {
  hidden: { opacity: 0, scale: 0.9, transition: OUT },
  shown: { opacity: 1, scale: 1, transition: IN },
};

function Circle({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div className="flex" variants={reduced ? undefined : circleMotion}>
      <motion.button
        type="button"
        aria-label={label}
        onClick={onClick}
        whileHover={reduced ? undefined : { scale: 1.03 }}
        whileTap={reduced ? undefined : { scale: 0.84 }}
        transition={PRESS}
        className={CIRCLE}
      >
        <svg
          {...ICON}
          width="14"
          height="14"
          stroke="currentColor"
          strokeWidth="3.5"
        >
          {children}
        </svg>
      </motion.button>
    </motion.div>
  );
}

type Status = "idle" | "restored" | "cancelled";

export type RestoreButtonProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  onConfirm?: () => void;
  onCancel?: () => void;
  requireConfirm?: boolean;
};

export function RestoreButton({
  className,
  onConfirm,
  onCancel,
  requireConfirm = false,
  ...props
}: RestoreButtonProps) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const trigger = useRef<HTMLButtonElement>(null);
  const timing = (transition: Transition) => (reduced ? INSTANT : transition);
  const lift = useMotionValue(0);

  useEffect(() => {
    if (status === "idle") return;
    const done = setTimeout(() => setStatus("idle"), HOLD[status === "restored" ? "restored" : "cancelled"]);
    return () => clearTimeout(done);
  }, [status]);

  const resolve = (next: Exclude<Status, "idle">) => {
    setOpen(false);
    setStatus(next);
    trigger.current?.focus();
    if (next === "restored") {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  };

  const handleTriggerClick = () => {
    if (requireConfirm) {
      if (open) return resolve("cancelled");
      setStatus("idle");
      setOpen(true);
    } else {
      // Direct instant tactile restore with spring animation
      resolve("restored");
    }
  };

  return (
    <motion.div
      data-slot="restore-button"
      data-state={open ? "open" : "closed"}
      data-status={status}
      className={cn("relative h-12 rounded-2xl", SURFACE, GLYPH, className)}
      animate={{ width: open ? TILE + PANEL : TILE }}
      transition={timing(WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) resolve("cancelled");
      }}
      {...props}
    >
      <motion.button
        ref={trigger}
        type="button"
        aria-label="Restore item"
        aria-expanded={open}
        onClick={handleTriggerClick}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        whileHover={reduced ? undefined : { scale: 1.05 }}
        transition={TAP}
        className={cn(
          "relative z-10 grid h-12 w-12 place-items-center rounded-2xl",
          FOCUS,
        )}
        title="Restore page"
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "restored" ? (
            <motion.svg
              key="restored-check"
              {...ICON}
              width="20"
              height="20"
              stroke={ACCENT}
              strokeWidth="2.5"
              initial={{ opacity: 0, scale: 0.6, y: 3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={timing(SWAP)}
            >
              <motion.path
                d="M4 12.5 9.5 18 20 7"
                initial={reduced ? undefined : { pathLength: 0 }}
                animate={reduced ? undefined : { pathLength: 1 }}
                transition={SETTLE}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="restore-tray"
              {...ICON}
              width="20"
              height="20"
              stroke="currentColor"
              strokeWidth="2"
              className="overflow-visible"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={timing(SWAP)}
            >
              {/* Tray Box Base */}
              <path d="M4 14.5v5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-5" />
              <path d="M2 14h20" />

              {/* Rising Recovery Arrow that floats up */}
              <motion.g
                animate={{
                  y: open ? -3 : [0, -2.5, 0],
                }}
                transition={
                  open
                    ? { type: "spring", stiffness: 350, damping: 20 }
                    : { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
                }
              >
                <path d="M12 15V4" />
                <path d="m7 9 5-5 5 5" />
              </motion.g>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      <span role="status" aria-live="polite" className="sr-only">
        {status === "restored" ? "Restored" : status === "cancelled" ? "Cancelled" : ""}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            style={{ width: PANEL }}
            className={cn(
              "absolute inset-y-0 right-0 flex items-center justify-center gap-2 rounded-2xl",
              RECESS,
            )}
            variants={reduced ? undefined : panelMotion}
            initial="hidden"
            animate="shown"
            exit="hidden"
          >
            <span
              aria-hidden
              className={cn(
                "absolute -left-1.25 top-1/2 z-20 h-2.5 w-1.5 -translate-y-1/2 [clip-path:polygon(100%_0,0_50%,100%_100%)]",
                RECESS,
              )}
            />
            <Circle label="Confirm restore" onClick={() => resolve("restored")}>
              <path d="M4 12.5 9.5 18 20 7" stroke={ACCENT} />
            </Circle>
            <Circle label="Cancel" onClick={() => resolve("cancelled")}>
              <path d="M6 6 18 18M18 6 6 18" />
            </Circle>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RestoreButton;
