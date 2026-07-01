import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

// Premium Spring Presets
export const SPRING_PRESETS = {
  soft: { type: "spring", stiffness: 120, damping: 18, mass: 1 },
  stiff: { type: "spring", stiffness: 350, damping: 28, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 220, damping: 12, mass: 0.7 },
  gentle: { type: "spring", stiffness: 90, damping: 16, mass: 1.2 }
};

// Check if user prefers reduced motion
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = (e) => setReduced(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ----------------------------------------------------
// 1. Premium Motion Input (Custom Caret, Floating Placeholder)
// ----------------------------------------------------
export const MotionInput = React.forwardRef(function MotionInput(
  {
    value = "",
    onChange,
    placeholder,
    type = "text",
    className = "",
    error = "",
    success = false,
    disabled = false,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [caretOffset, setCaretOffset] = useState(12); // padding-left offset initial
  const [showCustomCaret, setShowCustomCaret] = useState(false);

  const inputRef = useRef(null);
  const measurerRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useImperativeHandle(ref, () => inputRef.current);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // Track selection cursor to move custom caret
  const handleSelection = () => {
    const el = inputRef.current;
    if (!el || !measurerRef.current) return;
    
    // Copy font styles from input to measurer to ensure identical text width calculations
    const computed = window.getComputedStyle(el);
    measurerRef.current.style.fontFamily = computed.fontFamily;
    measurerRef.current.style.fontSize = computed.fontSize;
    measurerRef.current.style.fontWeight = computed.fontWeight;
    measurerRef.current.style.letterSpacing = computed.letterSpacing;

    const start = el.selectionStart || 0;
    const textBeforeCaret = el.value.slice(0, start);
    // Replace trailing spaces with non-breaking space for accurate sizing
    measurerRef.current.textContent = textBeforeCaret.replace(/ /g, "\u00a0");

    const rect = measurerRef.current.getBoundingClientRect();
    const scrollOffset = el.scrollLeft || 0;
    const paddingLeft = parseFloat(computed.paddingLeft) || 12;

    setCaretOffset(paddingLeft + rect.width - scrollOffset);
  };

  useEffect(() => {
    handleSelection();
  }, [value]);

  const onInputChange = (e) => {
    onChange?.(e);
    // Queue measurement to happen after React DOM updates
    setTimeout(handleSelection, 0);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    setShowCustomCaret(!reducedMotion && !disabled);
    onFocus?.(e);
    setTimeout(handleSelection, 0);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setShowCustomCaret(false);
    onBlur?.(e);
  };

  const isFloating = isFocused || (value !== undefined && value !== null && value.toString().length > 0);

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      {/* Hidden text width measurer */}
      <span
        ref={measurerRef}
        className="absolute top-0 left-0 invisible whitespace-pre pointer-events-none select-none text-[13px]"
      />

      <motion.div
        animate={
          reducedMotion
            ? {}
            : {
                borderColor: error
                  ? "rgba(239, 68, 68, 0.6)"
                  : success
                  ? "rgba(34, 197, 94, 0.6)"
                  : isFocused
                  ? "var(--accent)"
                  : "var(--border)",
                boxShadow: error
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : success
                  ? "0 0 0 2px rgba(34, 197, 94, 0.15)"
                  : isFocused
                  ? "0 0 0 2px var(--hover-strong)"
                  : "none"
              }
        }
        transition={SPRING_PRESETS.stiff}
        className={`relative flex items-center w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text)] transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed" : "hover:border-[var(--border-strong)]"
        }`}
      >
        {/* Floating placeholder */}
        {placeholder && (
          <motion.span
            animate={
              reducedMotion
                ? {}
                : {
                    y: isFloating ? -16 : 0,
                    scale: isFloating ? 0.8 : 1,
                    color: error
                      ? "rgba(239, 68, 68, 0.8)"
                      : isFocused
                      ? "var(--accent)"
                      : "var(--secondary)"
                  }
            }
            transition={SPRING_PRESETS.stiff}
            className="absolute left-3 origin-left pointer-events-none select-none text-[13px] z-10"
          >
            {placeholder}
          </motion.span>
        )}

        {/* TextInput field */}
        <input
          ref={inputRef}
          value={value}
          onChange={onInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyUp={handleSelection}
          onSelect={handleSelection}
          disabled={disabled}
          type={inputType}
          className={`w-full bg-transparent px-3 outline-none text-[13px] leading-8 text-[var(--text)] select-text disabled:cursor-not-allowed ${
            isPassword ? "pr-8" : ""
          } ${placeholder ? "pt-2 pb-0.5" : "py-1.5"}`}
          style={{
            // Hide native caret when custom caret is rendered
            caretColor: showCustomCaret ? "transparent" : "auto"
          }}
          {...props}
        />

        {/* Custom Caret */}
        <AnimatePresence>
          {showCustomCaret && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: caretOffset }}
              exit={{ opacity: 0 }}
              transition={SPRING_PRESETS.stiff}
              style={{
                top: placeholder ? "58%" : "50%",
                left: 0
              }}
              className="absolute w-[2px] h-[14px] bg-[var(--accent)] -translate-y-1/2 pointer-events-none animate-caret-pulse z-10"
            />
          )}
        </AnimatePresence>

        {/* Password toggle icon */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 text-[var(--secondary)] hover:text-[var(--text)] focus:outline-none p-1 rounded hover:bg-[var(--hover)] transition"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </motion.div>

      {/* Error text reveal */}
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_PRESETS.soft}
            className="text-xs text-[var(--danger)] mt-1 pl-1 font-medium overflow-hidden"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
});

// ----------------------------------------------------
// 2. Premium Auto-Grow Motion TextArea
// ----------------------------------------------------
export const MotionTextArea = React.forwardRef(function MotionTextArea(
  { value, onChange, placeholder, className = "", ...props },
  ref
) {
  const localRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const reducedMotion = useReducedMotion();

  useImperativeHandle(ref, () => localRef.current);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(32, el.scrollHeight)}px`;
  }, [value]);

  return (
    <motion.div
      animate={
        reducedMotion
          ? {}
          : {
              boxShadow: isFocused ? "inset 0 0 0 1px var(--border)" : "none"
            }
      }
      transition={SPRING_PRESETS.stiff}
      className={`relative w-full rounded-md bg-transparent transition ${className}`}
    >
      <textarea
        ref={localRef}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={1}
        placeholder={placeholder}
        className="w-full resize-none overflow-hidden bg-transparent px-1 py-1 text-[16px] leading-[1.7] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        {...props}
      />
    </motion.div>
  );
});

// ----------------------------------------------------
// 3. Animated Backdrop & Modal
// ----------------------------------------------------
export function AnimatedModal({ children, onClose, wide = false }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 grid place-items-start justify-center bg-black/50 pt-[10vh] backdrop-blur-[8px] saturate-[120%] px-4"
    >
      <motion.div
        initial={reducedMotion ? {} : { scale: 0.96, y: 15, opacity: 0 }}
        animate={reducedMotion ? {} : { scale: 1, y: 0, opacity: 1 }}
        exit={reducedMotion ? {} : { scale: 0.96, y: 10, opacity: 0 }}
        transition={SPRING_PRESETS.soft}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${
          wide ? "w-[680px]" : "w-[480px]"
        } max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ----------------------------------------------------
// 4. Staggered List Wrapper
// ----------------------------------------------------
export function StaggerContainer({ children, className = "", ...props }) {
  const reduced = useReducedMotion();
  const variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  return (
    <motion.div
      variants={reduced ? {} : variants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "", ...props }) {
  const reduced = useReducedMotion();
  const variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: SPRING_PRESETS.soft }
  };

  return (
    <motion.div variants={reduced ? {} : variants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

// ----------------------------------------------------
// 5. StreamingText with custom cursor for AI response streaming
// ----------------------------------------------------
export function StreamingText({ text, speed = 8, onComplete }) {
  const [displayedText, setDisplayedText] = useState("");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedText(text);
      onComplete?.();
      return;
    }
    
    let currentIdx = 0;
    setDisplayedText("");
    
    const interval = setInterval(() => {
      if (currentIdx < text.length) {
        setDisplayedText(text.slice(0, currentIdx + 1));
        currentIdx++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed, reducedMotion]);

  return (
    <span className="relative inline-block w-full">
      {displayedText}
      {displayedText.length < text.length && (
        <span className="ml-1 inline-block w-[6px] h-[14px] bg-[var(--accent)] align-middle animate-caret-pulse" />
      )}
    </span>
  );
}

