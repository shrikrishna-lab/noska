import React, {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AnimatedModal, SPRING_PRESETS } from "../../features/motion/MotionSystem";

export function useOutsideDismiss<T extends HTMLElement = HTMLElement>(
  open: boolean,
  onClose?: () => void
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose?.();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);
  return ref;
}

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  // Accepted for call-site compatibility (e.g. a "danger" tone) but not
  // currently read here — no styling branches on it exist yet in this
  // component today, only in call sites that pass it through.
  tone?: string;
}

export function IconButton({ icon: Icon, label, onClick, disabled, tone }: IconButtonProps) {
  return (
    <motion.button
      disabled={disabled}
      onClick={onClick}
      title={label}
      whileHover={disabled ? {} : { scale: 1.05, y: -0.5 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-35"
    >
      <Icon size={16} />
    </motion.button>
  );
}

interface ToastProps {
  message: string | null | undefined;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!message) return null;

  // Determine palette from message content based on user's reference image
  const isDanger = /delete|remove|cancel|error|failed|rejected/i.test(message);
  const isWarning = /warn|caution|pending|attention/i.test(message);
  const isInfo = /schedule|toggle|info|deploy|sync|load/i.test(message);
  const isSuccess = /success|accept|complete|done|created|saved|joined/i.test(message);

  let bg = "#CFD6C4"; // Default: Sage Mist
  let textColor = "#1E2721";
  let shadowGlow = "rgba(160, 175, 150, 0.4)";
  let dotColor = "#3B5244";

  if (isDanger) {
    bg = "#F3C3B2"; // Soft Coral Blossom
    textColor = "#2D1813";
    shadowGlow = "rgba(195, 105, 90, 0.45)";
    dotColor = "#8E3D2F";
  } else if (isWarning) {
    bg = "#FDE8D3"; // Vanilla Cream Peach
    textColor = "#362419";
    shadowGlow = "rgba(215, 150, 110, 0.45)";
    dotColor = "#8C5832";
  } else if (isInfo) {
    bg = "#99CDD8"; // Glacier Sky Blue
    textColor = "#122A30";
    shadowGlow = "rgba(100, 175, 195, 0.45)";
    dotColor = "#276270";
  } else if (isSuccess) {
    bg = "#DAEBE3"; // Mint Mist
    textColor = "#162E25";
    shadowGlow = "rgba(120, 175, 150, 0.4)";
    dotColor = "#2B6350";
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 480, damping: 28 }}
      style={{
        x: "-50%",
        background: `linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(0, 0, 0, 0.04) 100%), ${bg}`,
        boxShadow: `0 18px 45px -8px ${shadowGlow}, 0 6px 18px rgba(0, 0, 0, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px rgba(0, 0, 0, 0.08)`,
        border: "1px solid rgba(255, 255, 255, 0.75)",
        color: textColor,
      }}
      className="fixed bottom-7 left-1/2 z-[120] rounded-full px-5 py-2.5 text-[12.5px] font-bold shadow-2xl backdrop-blur-2xl select-none flex items-center gap-2.5 tracking-tight pointer-events-auto"
      role="alert"
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <span>{message}</span>
    </motion.div>,
    document.body
  );
}

type FloatingMenuAlign = "left" | "right" | "center" | "bottom";

interface FloatingMenuProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  children: ReactNode;
  width?: number;
  preferredAlign?: FloatingMenuAlign;
}

export function FloatingMenu({ open, anchorRef, onClose, children, width = 320, preferredAlign = "right" }: FloatingMenuProps) {
  const menuRef = useOutsideDismiss<HTMLDivElement>(open, onClose);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [maxHeight, setMaxHeight] = useState(480);

  useEffect(() => {
    if (!open || !anchorRef.current) return undefined;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const margin = 12;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let left: number, top: number;

      if (preferredAlign === "right") {
        left = rect.right + 4;
        if (left + width > winW - margin) {
          left = rect.left - width - 4;
        }
      } else if (preferredAlign === "left") {
        left = rect.left - width - 4;
        if (left < margin) {
          left = rect.right + 4;
        }
      } else if (preferredAlign === "center") {
        left = rect.left + rect.width / 2 - width / 2;
        if (left + width > winW - margin) left = winW - width - margin;
      } else if (preferredAlign === "bottom") {
        left = rect.left;
        if (left + width > winW - margin) left = winW - width - margin;
      } else {
        left = rect.left;
      }
      if (left < margin) left = margin;

      const spaceBelow = winH - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      let menuH = 480;

      if (spaceBelow >= 200) {
        top = rect.bottom + 4;
        menuH = Math.min(spaceBelow - 4, 520);
      } else if (spaceAbove >= 200) {
        top = rect.top - Math.min(spaceAbove - 4, 520);
        menuH = Math.min(spaceAbove - 4, 520);
      } else {
        top = Math.max(margin, spaceBelow > spaceAbove ? rect.bottom + 4 : margin);
        menuH = Math.max(150, Math.min(winH - margin * 2, spaceBelow > spaceAbove ? spaceBelow - 4 : spaceAbove - 4));
      }

      setMaxHeight(menuH);
      setPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, width, preferredAlign]);

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: -6 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 380,
        damping: 26,
        staggerChildren: 0.03,
        delayChildren: 0.02
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -3,
      transition: { duration: 0.12 }
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ top: pos.top, left: pos.left, width, maxHeight: `min(${maxHeight}px, calc(100vh - 24px))`, transformOrigin: "top left", scrollBehavior: "smooth" }}
          className="fixed z-[100] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[var(--text)] shadow-[var(--shadow-floating)] scrollbar-none"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}


interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}

export function Modal({ children, onClose, wide }: ModalProps) {
  return (
    <AnimatedModal onClose={onClose} wide={wide}>
      {children}
    </AnimatedModal>
  );
}

interface ModalHeaderProps {
  icon: LucideIcon;
  title: ReactNode;
  onClose?: () => void;
}

export function ModalHeader({ icon: Icon, title, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
      <Icon size={18} />
      <div className="flex-1 font-semibold">{title}</div>
      <IconButton icon={X} label="Close" onClick={onClose} />
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[var(--secondary)]">{label}</span>
      {children}
    </label>
  );
}

export function Confetti() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center text-5xl select-none"
    >
      🎉
    </motion.div>
  );
}

interface TextAreaProps {
  value?: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { value, onChange, onKeyDown, onPaste, onFocus, onBlur, className = "", placeholder, readOnly, disabled, style },
  ref
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  const setRef = (node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(40, el.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={setRef}
      value={value || ""}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={(e) => {
        onFocus?.(e);
      }}
      onBlur={(e) => {
        onBlur?.(e);
      }}
      rows={1}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      style={{ lineHeight: "inherit", ...style }}
      className={`w-full resize-none overflow-hidden bg-transparent px-2 py-1.5 text-[var(--text)] outline-none placeholder:text-[var(--muted)] ${className}`}
    />
  );
});

export { default as PearlButton } from "./PearlButton";
export { default as VoiceDictator } from "./voice-dictator";
export { VoiceInput, VoiceFloatingIndicator, VoicePill, RealtimeEqualizer, StreamingWordText } from "./voice-input";
export { default as VoiceCustomizationSettings } from "../settings/VoiceCustomizationSettings";
export * from "../../lib/voice/voice-settings";
export { Banner04 } from "./banner-04";
export { default as HowItWorks } from "./how-it-works";
export type { HowItWorksProps, Step, StepPosition } from "./how-it-works";
export { InteractiveTOC } from "./interactive-toc";
export type { TOCItem, InteractiveTOCProps } from "./interactive-toc";
export { ChapterScrubber, default as ChapterScrubberDefault } from "./chapter-scrubber";
export type { Chapter, ChapterScrubberProps } from "./chapter-scrubber";
export { LineNavigationRail, default as LineNavigationRailDefault } from "../../features/navigation/line-nav/LineNavigationRail";
export * from "../../features/navigation/line-nav/types";
export * from "../../features/navigation/line-nav/previewExtractor";
export * from "../../features/navigation/line-nav/PagePreviewCard";
export { AdaptiveSlider, AdaptiveReasoningSlider, default as AdaptiveSliderDefault } from "./adaptive-slider";
export type { AdaptiveSliderProps, AdaptiveReasoningSliderProps, ColorSettings } from "./adaptive-slider";
export { InlineAction, default as InlineActionDefault } from "./inline-action";
export type { InlineActionProps } from "./inline-action";
export { InlineActionBase, default as InlineActionBaseDefault } from "./inline-action-base";
export type { InlineActionBaseProps } from "./inline-action-base";
export { OptionPicker, default as OptionPickerDefault } from "./quick-option-picker";
export type { OptionPickerProps, Option } from "./quick-option-picker";
export { OptionPickerBase, default as OptionPickerBaseDefault } from "./quick-option-picker-base";
export type { OptionPickerBaseProps } from "./quick-option-picker-base";
export { AiPromptInput, ReasoningEffortButton } from "./ai-prompt-input";
export { LiquidMetalButton } from "./liquid-metal-button";
