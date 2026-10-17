import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { getSafePageIcon, getSafePageTitle } from "../../utils/pageLabels";

/**
 * The "active document context" pill + searchable page dropdown.
 *
 * Extracted from AIPanel.tsx (where it was inline) so the right-hand panel can
 * offer the same switcher. Duplicating ~180 lines across two panels would mean
 * the two pickers drift — which is exactly what happened to the block-colour
 * menus (BlockContextMenu and SelectionAIBar) before they were unified.
 *
 * Renders nothing when there is no page, so callers can mount it unconditionally.
 */

const SPRING_APPLE = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.8 };

export interface PageContextPickerProps {
  page: any;
  pages: any[];
  onSelectPage?: (page: any) => void;
  onToast?: (msg: string) => void;
  /** Aligns the dropdown to the left or right edge of the pill. */
  align?: "left" | "right";
  /**
   * The floating "Live Preview" card that opens beside the dropdown.
   *
   * It is 320px wide and only fits beside a wide surface. In a narrow docked
   * panel it would be pushed off-screen, so callers can turn it off and rely
   * on the inline snippet each row already carries.
   */
  hoverPreview?: boolean;
  /** Applied to the root, so hosts can control how the pill yields space. */
  className?: string;
  /**
   * Open the list *outside* the host surface, to its left, instead of overlaying
   * it. The right-hand panel uses this: the list would otherwise cover the
   * prompt chips and the empty-state text underneath it.
   */
  outside?: boolean;
}

export function PageContextPicker({
  page,
  pages,
  onSelectPage,
  onToast,
  align = "left",
  hoverPreview = true,
  className = "",
  outside = false,
}: PageContextPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState<any>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p: any) => {
      const title = String(getSafePageTitle(p.title) ?? "").toLowerCase();
      const inside = (p.blocks || [])
        .map((b: any) => b.text || "")
        .join(" ")
        .toLowerCase();
      return title.includes(q) || inside.includes(q);
    });
  }, [pages, search]);

  /**
   * Position the viewport-fixed list beside the panel.
   *
   * Measured in a layout effect *after* the list mounts, not on click. The
   * panel animates open with a spring, so a rect read during the click handler
   * captures the panel mid-flight and the list lands somewhere stale — which
   * is what it did. Measuring the list itself also removes the hardcoded
   * 320px width, which silently rots the moment that class changes.
   *
   * Re-runs on scroll and resize, so it stays pinned while either moves.
   */
  useLayoutEffect(() => {
    if (!open || !outside) return;
    const place = () => {
      const pill = pillRef.current;
      const drop = dropRef.current;
      if (!pill || !drop) return;
      const r = pill.getBoundingClientRect();
      const w = drop.offsetWidth || 320;
      const GAP = 8;
      setAnchor({ top: Math.max(8, r.top), left: Math.max(8, r.left - GAP - w) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, outside]);

  /**
   * Escape closes the list from anywhere in the document.
   *
   * The input's own onKeyDown only fires when it has focus, and focus leaves it
   * as soon as the user clicks a row, tabs away, or opens the model picker —
   * so Escape silently did nothing in exactly the situations where a user
   * reaches for it to back out. A capture-phase listener on document is the
   * only thing that sees the key regardless of where focus sits.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setHovered(null);
      setSearch("");
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!page) return null;

  const listNode = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropRef}
          initial={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(6px)" }}
          transition={SPRING_APPLE}
          onMouseLeave={() => setHovered(null)}
          className={`rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.04)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl z-[100] space-y-1.5 w-80 max-h-[min(28rem,calc(100vh-1rem))] overflow-y-auto scrollbar-thin ${
            outside
              ? // Until the layout effect has measured, sit inert at the origin
                // rather than falling back to `absolute` inside the panel,
                // which flashed the list in the wrong place for a frame.
                `fixed origin-top-left ${anchor ? "" : "opacity-0 pointer-events-none top-0 left-0"}`
              : `absolute top-full mt-2 origin-top ${
                  align === "right" ? "right-0" : "left-0"
                } w-[min(20rem,calc(100vw-2.5rem))] sm:w-80`
          }`}
          style={outside && anchor ? { top: anchor.top, left: anchor.left } : undefined}
        >
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08]">
            <Search size={12} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  // stopPropagation so the document-level handler below does
                  // not also run; either one closing it is fine, but doing it
                  // twice would clear the search box as well.
                  e.stopPropagation();
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder="Search pages..."
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1 pt-1">
            {filtered.map((p: any) => {
              const displayTitle = getSafePageTitle(p.title);
              const snippet = (p.blocks || [])
                .slice(0, 4)
                .map((b: any) => b.text || "")
                .filter(Boolean)
                .join(" ")
                .slice(0, 85);

              const isHovered = hovered?.id === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setHovered(p)}
                  onClick={() => {
                    onSelectPage?.(p);
                    setOpen(false);
                    setHovered(null);
                    setSearch("");
                    onToast?.(`Switched active context to “${displayTitle}”`);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    p.id === page.id
                      ? "bg-black/[0.06] dark:bg-white/[0.10] border border-black/[0.08] dark:border-white/[0.12] shadow-2xs"
                      : isHovered
                      ? "bg-black/[0.04] dark:bg-white/[0.06] text-foreground border border-black/[0.05] dark:border-white/[0.07]"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                    {getSafePageIcon(p.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs truncate font-medium ${
                          p.id === page.id ? "text-foreground font-semibold" : ""
                        }`}
                      >
                        {displayTitle}
                      </span>
                      {p.id === page.id && (
                        <Check
                          size={12}
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                      {snippet || "No content inside yet"}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-4 text-[11px] text-muted-foreground">
                No matching pages found
              </div>
            )}
          </div>

          <AnimatePresence>
            {hovered && hoverPreview && (
              <motion.div
                initial={{ opacity: 0, x: 8, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className={`hidden md:block absolute top-0 w-80 rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 p-4 shadow-2xl backdrop-blur-2xl z-50 text-left space-y-3 ${
                  align === "right"
                    ? "right-[calc(100%+8px)] origin-top-right"
                    : "left-[calc(100%+8px)]"
                }`}
              >
                <div className="space-y-1.5 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center text-sm shrink-0">
                      {getSafePageIcon(hovered.icon)}
                    </div>
                    <h4 className="text-xs font-bold text-foreground truncate">
                      {getSafePageTitle(hovered.title)}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{(hovered.blocks || []).length} blocks</span>
                    <span>•</span>
                    <span>Active Workspace Document</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin text-xs">
                  {(hovered.blocks || []).length > 0 ? (
                    (hovered.blocks || []).slice(0, 6).map((b: any, idx: number) => {
                      const text = b.text || "";
                      if (!text.trim()) return null;

                      if (b.type === "heading_1" || b.type === "heading_2") {
                        return (
                          <p key={b.id || idx} className="font-bold text-foreground text-xs pt-1">
                            {text}
                          </p>
                        );
                      }
                      if (b.type === "bullet_list" || b.type === "todo") {
                        return (
                          <div
                            key={b.id || idx}
                            className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                          >
                            <span className="text-purple-600 dark:text-purple-400">•</span>
                            <span className="line-clamp-2 leading-relaxed">{text}</span>
                          </div>
                        );
                      }
                      if (b.type === "callout") {
                        return (
                          <div
                            key={b.id || idx}
                            className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-[11px] text-foreground"
                          >
                            {text}
                          </div>
                        );
                      }
                      return (
                        <p
                          key={b.id || idx}
                          className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed"
                        >
                          {text}
                        </p>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground italic">
                      Empty page — no text content yet
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    ✦ Click to select
                  </span>
                  <span>Live Preview</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={pillRef} className={`relative shrink-0 ${className}`}>
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        aria-label={`Active document context: ${getSafePageTitle(page.title)}. Change page.`}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08] text-xs font-medium text-foreground transition-colors shadow-2xs cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
        title="Click to switch active document context"
      >
        <span className="flex items-center shrink-0">{getSafePageIcon(page.icon)}</span>
        <span className="truncate max-w-[150px] font-medium text-[12px]">
          {getSafePageTitle(page.title)}
        </span>
        <ChevronDown
          size={11}
          className={`text-muted-foreground opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </motion.button>

      {outside ? createPortal(listNode, document.body) : listNode}
    </div>
  );
}

export default PageContextPicker;