import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedModal, SPRING_PRESETS } from "../../features/motion/MotionSystem";

export function useOutsideDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose?.();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);
  return ref;
}

export function IconButton({ icon: Icon, label, onClick, disabled, tone }) {
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

export function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!message) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      style={{ x: "-50%" }}
      className="fixed bottom-6 left-1/2 z-[120] rounded-lg bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] shadow-[var(--shadow)] ring-1 ring-[var(--border)] select-none"
    >
      {message}
    </motion.div>,
    document.body
  );
}

export function FloatingMenu({ open, anchorRef, onClose, children, width = 320, preferredAlign = "right" }) {
  const menuRef = useOutsideDismiss(open, onClose);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [maxHeight, setMaxHeight] = useState(480);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return undefined;
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const margin = 12;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let left, top;

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

  const containerVariants = {
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


export function Modal({ children, onClose, wide }) {
  return (
    <AnimatedModal onClose={onClose} wide={wide}>
      {children}
    </AnimatedModal>
  );
}

export function ModalHeader({ icon: Icon, title, onClose }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
      <Icon size={18} />
      <div className="flex-1 font-semibold">{title}</div>
      <IconButton icon={X} label="Close" onClick={onClose} />
    </div>
  );
}

export function Field({ label, children }) {
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

export const TextArea = React.forwardRef(function TextArea({ value, onChange, onKeyDown, onPaste, onFocus, onBlur, className = "", placeholder, readOnly, disabled, style }, ref) {
  const localRef = useRef(null);

  const setRef = (node) => {
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
      onChange={(e) => onChange(e.target.value)}
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

