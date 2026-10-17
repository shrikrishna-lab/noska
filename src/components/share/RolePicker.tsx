/**
 * Access-level picker for a shared page.
 *
 * Replaces the native `<select>` this used to be. A native select renders the
 * OS list — a grey box with a blue system highlight that ignores the product's
 * typography, spacing and dark theme, and cannot explain what each level
 * actually means. This is a custom menu with the same keyboard behaviour:
 *
 *   - Enter / Space / ArrowDown  open (ArrowUp opens and focuses the last item)
 *   - ArrowUp / ArrowDown        move the active option
 *   - Home / End                 jump to first / last
 *   - Escape / Tab / outside click  dismiss and restore focus
 *   - type-ahead                 jump to an option starting with the typed letter
 *
 * The trigger is a real `<button>` with `aria-haspopup="listbox"`, and the menu
 * is a `role="listbox"` of `role="option"` items, so screen readers announce it
 * as a choice rather than a mystery widget.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, MessageSquare, Pencil, Eye, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AccessLevel = "editor" | "co-owner" | "commenter" | "viewer";

interface RoleOption {
  value: AccessLevel;
  label: string;
  hint: string;
  icon: LucideIcon;
}

// Order is deliberate: the first entry is the default a fresh invite starts on,
// and the list runs from most to least access.
const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "co-owner",
    label: "Can manage",
    hint: "Edit, share and manage collaborators",
    icon: ShieldCheck,
  },
  {
    value: "editor",
    label: "Can edit",
    hint: "Edit and collaborate live",
    icon: Pencil,
  },
  {
    value: "commenter",
    label: "Can comment",
    hint: "Comment, no content edits",
    icon: MessageSquare,
  },
  {
    value: "viewer",
    label: "Can view",
    hint: "Read only",
    icon: Eye,
  },
];

// Looked up by value rather than index: adding a role shifted the positional
// fallbacks below, which silently turned "unknown role" into "Can comment".
const VIEWER_OPTION = ROLE_OPTIONS.find((o) => o.value === "viewer")!;

export function roleLabel(value: string | null | undefined): string {
  return ROLE_OPTIONS.find((o) => o.value === value)?.label ?? VIEWER_OPTION.label;
}

export function roleHint(value: string | null | undefined): string {
  return ROLE_OPTIONS.find((o) => o.value === value)?.hint ?? VIEWER_OPTION.hint;
}

interface RolePickerProps {
  value: AccessLevel;
  onChange: (value: AccessLevel) => void;
  disabled?: boolean;
  /** `compact` is the collaborator row, `default` the invite field. */
  size?: "compact" | "default";
  /** Renders the emoji variant used by the invite field. */
  withEmoji?: boolean;
  ariaLabel?: string;
  className?: string;
}

export default function RolePicker({
  value,
  onChange,
  disabled = false,
  size = "default",
  withEmoji = false,
  ariaLabel = "Access level",
  className = "",
}: RolePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, ROLE_OPTIONS.findIndex((o) => o.value === value)),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeAhead = useRef({ buffer: "", at: 0 });
  const listboxId = useId();

  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? VIEWER_OPTION;

  const openMenu = useCallback(
    (focusLast?: boolean) => {
      if (disabled) return;
      const index = ROLE_OPTIONS.findIndex((o) => o.value === value);
      setActiveIndex(focusLast ? ROLE_OPTIONS.length - 1 : Math.max(0, index));
      setOpen(true);
    },
    [disabled, value],
  );

  const closeMenu = useCallback(
    (restoreFocus = true) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [],
  );

  const commit = useCallback(
    (index: number) => {
      const option = ROLE_OPTIONS[index];
      if (!option) return;
      onChange(option.value);
      closeMenu();
    },
    [closeMenu, onChange],
  );

  // Dismiss on outside interaction. `pointerdown` rather than `click` so the
  // menu closes before the click lands on whatever is underneath.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeMenu(false);
    };
    const onScrollCapture = () => closeMenu(false);
    document.addEventListener("pointerdown", onPointerDown, true);
    // A scrolling ancestor (the modal body scrolls) would otherwise leave the
    // menu stranded, detached from its trigger.
    window.addEventListener("scroll", onScrollCapture, true);
    window.addEventListener("resize", onScrollCapture);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScrollCapture, true);
      window.removeEventListener("resize", onScrollCapture);
    };
  }, [closeMenu, open]);

  // Keep the active option in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Arrow keys must land in the menu, not the trigger: the trigger only knows
  // how to open. Moving focus into the listbox is what makes Enter/Space pick
  // the active option and Escape dismiss, matching native select behaviour.
  useEffect(() => {
    if (!open) return;
    listboxRef.current?.focus({ preventScroll: true });
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        e.preventDefault();
        openMenu();
        return;
      case "ArrowUp":
        e.preventDefault();
        openMenu(true);
        return;
      default:
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        // Stop here: the ShareModal also closes on Escape, and without this a
        // single Escape would tear down the whole dialog instead of just the
        // menu the user opened.
        e.stopPropagation();
        closeMenu();
        return;
      case "Tab":
        // Let focus move on, but do not leave an orphaned menu behind.
        closeMenu(false);
        return;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % ROLE_OPTIONS.length);
        return;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length);
        return;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        e.preventDefault();
        setActiveIndex(ROLE_OPTIONS.length - 1);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        return;
      default:
        break;
    }

    // Type-ahead: "e" jumps to Edit, repeated "c" cycles Comment.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const state = typeAhead.current;
      state.buffer = now - state.at > 700 ? e.key : state.buffer + e.key;
      state.at = now;
      const query = state.buffer.toLowerCase();
      const from = e.shiftKey ? ROLE_OPTIONS.length - 1 : activeIndex;
      for (let step = 0; step < ROLE_OPTIONS.length; step++) {
        const index = (from + step + 1) % ROLE_OPTIONS.length;
        if (ROLE_OPTIONS[index].label.toLowerCase().startsWith(query)) {
          setActiveIndex(index);
          break;
        }
      }
    }
  };

  const compact = size === "compact";
  const SelectedIcon = selected.icon;

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${ariaLabel}: ${selected.label}`}
        className={[
          "group/trigger relative inline-flex items-center gap-1.5 rounded-full font-medium",
          "border border-black/[0.07] dark:border-white/[0.09]",
          "bg-white/80 dark:bg-white/[0.05]",
          "text-neutral-700 dark:text-neutral-200",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out",
          "hover:bg-white dark:hover:bg-white/[0.09]",
          "hover:border-black/[0.12] dark:hover:border-white/[0.16]",
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
          "active:scale-[0.98] active:shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1a1917]",
          "disabled:opacity-45 disabled:pointer-events-none",
          compact ? "h-6 pl-2 pr-1.5 text-[11px]" : "h-7 pl-2.5 pr-2 text-[11.5px]",
        ].join(" ")}
      >
        <SelectedIcon size={compact ? 11 : 12} className="shrink-0 opacity-70" aria-hidden="true" />
        <span className="whitespace-nowrap">{selected.label}</span>
        <ChevronDown
          size={compact ? 10 : 11}
          aria-hidden="true"
          className={`shrink-0 text-neutral-400 transition-transform duration-200 ease-out ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onMouseDown={() => closeMenu()} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
              // Anchored to the right edge so it stays inside the modal for the
              // collaborator rows at the far side of the card.
              className="absolute right-0 top-full z-30 mt-1.5 w-[248px] origin-top-right overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#22211e]/95"
            >
              <div
                ref={listboxRef}
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                aria-activedescendant={`${listboxId}-${ROLE_OPTIONS[activeIndex].value}`}
                tabIndex={-1}
                onKeyDown={onMenuKeyDown}
                className="outline-none"
              >
                {ROLE_OPTIONS.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === activeIndex;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      ref={(node) => {
                        itemRefs.current[index] = node;
                      }}
                      type="button"
                      id={`${listboxId}-${option.value}`}
                      role="option"
                      aria-selected={isSelected}
                      // Pointer and keyboard highlight the same row, so hover
                      // and arrow keys never disagree about what is focused.
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(index)}
                      className={[
                        "relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left",
                        "transition-colors duration-100 cursor-pointer outline-none",
                        isActive
                          ? "bg-neutral-100/90 dark:bg-white/[0.09]"
                          : "bg-transparent",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors duration-150",
                          isActive
                            ? "bg-white text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/[0.14] dark:text-neutral-100"
                            : "bg-neutral-100/70 text-neutral-500 dark:bg-white/[0.05] dark:text-neutral-400",
                        ].join(" ")}
                      >
                        <Icon size={12} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {option.label}
                          {withEmoji && (
                            <span aria-hidden="true" className="ml-1.5 opacity-70">
                              {option.value === "editor" ? "✍️" : option.value === "commenter" ? "💬" : "👁️"}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-neutral-500 dark:text-neutral-400">
                          {option.hint}
                        </span>
                      </span>
                      {isSelected && (
                        <Check
                          size={13}
                          aria-hidden="true"
                          className="shrink-0 text-[#0066FF] dark:text-[#4791FF]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}