import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Block } from "../../../types/blocks";
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Code2,
  Lightbulb,
  CheckSquare,
  Square,
  Quote,
  Table2,
  Image as ImageIcon,
  Video,
  FileText,
  Sigma,
  Sparkles,
  ChevronRight,
  List,
  ListOrdered,
  Minus,
  Bookmark,
  AlignLeft
} from "lucide-react";

export interface OutlineSection {
  id: string;
  title: string;
  snippet: string;
  type: string;
  depth: number;
  width?: number;
  commandTag: string;
  iconName: string;
  category: string;
  colorScheme: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    glow: string;
  };
  meta?: {
    lang?: string;
    checked?: boolean;
    charCount?: number;
    wordCount?: number;
    rowCount?: number;
    colCount?: number;
    url?: string;
    caption?: string;
  };
  rawBlock?: Block;
}

interface DocumentOutlineRulerProps {
  blocks?: Block[];
  sections?: OutlineSection[];
  pageTitle?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  onJumpToSection?: (id: string) => void;
  className?: string;
  side?: "left" | "right";
}

export default function DocumentOutlineRuler({
  blocks,
  sections: customSections,
  pageTitle,
  containerRef,
  onJumpToSection,
  className = "",
  side = "left"
}: DocumentOutlineRulerProps) {
  const [hoveredSection, setHoveredSection] = useState<OutlineSection | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number; right: number } | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [rulerPos, setRulerPos] = useState<{ left: number; top: number; visible: boolean }>({
    left: 20,
    top: 0,
    visible: false
  });
  const rulerRef = useRef<HTMLDivElement>(null);

  // Derive comprehensive outline sections from all real blocks in the document
  const outlineSections = useMemo(() => {
    if (customSections && customSections.length > 0) return customSections;
    if (!blocks || blocks.length === 0) return [];

    const list: OutlineSection[] = [];

    // Optional page title at the top of outline
    if (pageTitle && pageTitle.trim()) {
      list.push({
        id: "page-title",
        title: pageTitle.trim(),
        snippet: "Document Header & Title",
        type: "Document",
        depth: 0,
        width: 26,
        commandTag: "/title",
        iconName: "FileText",
        category: "Document",
        colorScheme: {
          badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
          badgeText: "text-blue-600 dark:text-blue-400",
          badgeBorder: "border-blue-500/20",
          glow: "rgba(59, 130, 246, 0.15)",
        },
        meta: {
          wordCount: pageTitle.trim().split(/\s+/).length,
          charCount: pageTitle.trim().length,
        }
      });
    }

    blocks.forEach((b) => {
      const props = (b.properties as Record<string, unknown> | undefined) || {};
      const text = (b.text || props.text || props.title || "").toString().trim();
      const type = (b.type || "text").toLowerCase();
      const charCount = text.length;
      const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;

      // 1. Headings (H1, H2, H3, H4, Header)
      if (type === "h1" || type === "header" || type === "heading-1") {
        const raw = text.replace(/^[#*-]\s+/, "") || "Heading 1";
        list.push({
          id: b.id,
          title: raw,
          snippet: text,
          type: "Heading 1",
          depth: 0,
          width: 24,
          commandTag: "/h1",
          iconName: "Heading1",
          category: "Headings",
          colorScheme: {
            badgeBg: "bg-sky-500/15",
            badgeText: "text-sky-400",
            badgeBorder: "border-sky-500/30",
            glow: "rgba(56, 189, 248, 0.2)",
          },
          meta: { wordCount, charCount },
          rawBlock: b,
        });
        return;
      }

      if (type === "h2" || type === "heading-2") {
        const raw = text.replace(/^[#*-]\s+/, "") || "Heading 2";
        list.push({
          id: b.id,
          title: raw,
          snippet: text,
          type: "Heading 2",
          depth: 1,
          width: 20,
          commandTag: "/h2",
          iconName: "Heading2",
          category: "Headings",
          colorScheme: {
            badgeBg: "bg-indigo-500/15",
            badgeText: "text-indigo-400",
            badgeBorder: "border-indigo-500/30",
            glow: "rgba(99, 102, 241, 0.2)",
          },
          meta: { wordCount, charCount },
          rawBlock: b,
        });
        return;
      }

      if (type === "h3" || type === "heading-3") {
        const raw = text.replace(/^[#*-]\s+/, "") || "Heading 3";
        list.push({
          id: b.id,
          title: raw,
          snippet: text,
          type: "Heading 3",
          depth: 2,
          width: 16,
          commandTag: "/h3",
          iconName: "Heading3",
          category: "Headings",
          colorScheme: {
            badgeBg: "bg-violet-500/15",
            badgeText: "text-violet-400",
            badgeBorder: "border-violet-500/30",
            glow: "rgba(139, 92, 246, 0.2)",
          },
          meta: { wordCount, charCount },
          rawBlock: b,
        });
        return;
      }

      if (type === "h4" || type === "heading-4") {
        const raw = text.replace(/^[#*-]\s+/, "") || "Heading 4";
        list.push({
          id: b.id,
          title: raw,
          snippet: text,
          type: "Heading 4",
          depth: 2,
          width: 14,
          commandTag: "/h4",
          iconName: "Heading4",
          category: "Headings",
          colorScheme: {
            badgeBg: "bg-purple-500/15",
            badgeText: "text-purple-400",
            badgeBorder: "border-purple-500/30",
            glow: "rgba(168, 85, 247, 0.2)",
          },
          meta: { wordCount, charCount },
          rawBlock: b,
        });
        return;
      }

      // 2. Code Block
      if (type === "code" || type === "codeblock" || type === "snippet") {
        const lang = (props.language as string) || "typescript";
        const lineCount = text ? text.split("\n").length : 1;
        list.push({
          id: b.id,
          title: `Code Block (${lang})`,
          snippet: text || "// Empty code block",
          type: "Code",
          depth: 1,
          width: 20,
          commandTag: "/code",
          iconName: "Code2",
          category: "Technical",
          colorScheme: {
            badgeBg: "bg-emerald-500/15",
            badgeText: "text-emerald-400",
            badgeBorder: "border-emerald-500/30",
            glow: "rgba(52, 211, 153, 0.2)",
          },
          meta: { lang, charCount, wordCount: lineCount },
          rawBlock: b,
        });
        return;
      }

      // 3. Callout Block
      if (type === "callout" || type === "alert" || type === "note") {
        const icon = (props.icon as string) || "💡";
        list.push({
          id: b.id,
          title: `${icon} Callout Note`,
          snippet: text || "Important note callout",
          type: "Callout",
          depth: 1,
          width: 18,
          commandTag: "/callout",
          iconName: "Lightbulb",
          category: "Callouts",
          colorScheme: {
            badgeBg: "bg-amber-500/15",
            badgeText: "text-amber-400",
            badgeBorder: "border-amber-500/30",
            glow: "rgba(251, 191, 36, 0.2)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 4. To-Do / Task Block
      if (type === "todo" || type === "task" || type === "checklist") {
        const checked = Boolean(props.checked);
        list.push({
          id: b.id,
          title: `${checked ? "☑" : "☐"} ${text || "To-do item"}`,
          snippet: text || "Task item",
          type: checked ? "Task (Completed)" : "Task (Pending)",
          depth: 1,
          width: 16,
          commandTag: "/todo",
          iconName: checked ? "CheckSquare" : "Square",
          category: "Tasks",
          colorScheme: {
            badgeBg: checked ? "bg-emerald-500/15" : "bg-orange-500/15",
            badgeText: checked ? "text-emerald-400" : "text-orange-400",
            badgeBorder: checked ? "border-emerald-500/30" : "border-orange-500/30",
            glow: checked ? "rgba(52, 211, 153, 0.2)" : "rgba(249, 115, 22, 0.2)",
          },
          meta: { checked, charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 5. Quote Block
      if (type === "quote" || type === "blockquote") {
        list.push({
          id: b.id,
          title: `“ ${text || "Quote"}`,
          snippet: text || "Quoted excerpt",
          type: "Quote",
          depth: 1,
          width: 16,
          commandTag: "/quote",
          iconName: "Quote",
          category: "Typography",
          colorScheme: {
            badgeBg: "bg-rose-500/15",
            badgeText: "text-rose-400",
            badgeBorder: "border-rose-500/30",
            glow: "rgba(251, 113, 133, 0.2)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 6. Database / Table / Board / Kanban
      if (type === "table" || type === "database" || type === "kanban" || type === "board" || type === "gallery") {
        const dbTitle = (props.title as string) || text || "Database View";
        list.push({
          id: b.id,
          title: `⊞ ${dbTitle}`,
          snippet: `Interactive ${type} data view`,
          type: type.toUpperCase(),
          depth: 0,
          width: 22,
          commandTag: `/${type}`,
          iconName: "Table2",
          category: "Databases",
          colorScheme: {
            badgeBg: "bg-teal-500/15",
            badgeText: "text-teal-400",
            badgeBorder: "border-teal-500/30",
            glow: "rgba(45, 212, 191, 0.2)",
          },
          meta: { rowCount: 5, colCount: 4 },
          rawBlock: b,
        });
        return;
      }

      // 7. Media (Images, Videos, Files, PDF, Audio)
      if (type === "image" || type === "video" || type === "file" || type === "audio" || type === "pdf") {
        const caption = (props.caption as string) || (props.url as string) || text || "Media Resource";
        list.push({
          id: b.id,
          title: `🖼 ${type.toUpperCase()}`,
          snippet: caption,
          type: type.toUpperCase(),
          depth: 1,
          width: 16,
          commandTag: `/${type}`,
          iconName: type === "video" ? "Video" : type === "image" ? "ImageIcon" : "FileText",
          category: "Media",
          colorScheme: {
            badgeBg: "bg-pink-500/15",
            badgeText: "text-pink-400",
            badgeBorder: "border-pink-500/30",
            glow: "rgba(244, 114, 182, 0.2)",
          },
          meta: { caption, url: props.url as string },
          rawBlock: b,
        });
        return;
      }

      // 8. Math / Equations
      if (type === "math" || type === "equation" || type === "latex") {
        list.push({
          id: b.id,
          title: `∑ Math Equation`,
          snippet: text || "Formula: f(x) = ...",
          type: "Math",
          depth: 1,
          width: 16,
          commandTag: "/math",
          iconName: "Sigma",
          category: "Advanced",
          colorScheme: {
            badgeBg: "bg-yellow-500/15",
            badgeText: "text-yellow-400",
            badgeBorder: "border-yellow-500/30",
            glow: "rgba(250, 204, 21, 0.2)",
          },
          meta: { charCount },
          rawBlock: b,
        });
        return;
      }

      // 9. AI Blocks / Prompts
      if (type === "ai" || type === "prompt" || type === "agent" || type === "chat") {
        list.push({
          id: b.id,
          title: `✦ AI Workspace`,
          snippet: text || "AI Generation prompt & output",
          type: "AI Block",
          depth: 0,
          width: 22,
          commandTag: "/ai",
          iconName: "Sparkles",
          category: "Intelligence",
          colorScheme: {
            badgeBg: "bg-fuchsia-500/15",
            badgeText: "text-fuchsia-400",
            badgeBorder: "border-fuchsia-500/30",
            glow: "rgba(217, 70, 249, 0.25)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 10. Toggle Lists
      if (type === "toggle" || type === "accordion") {
        list.push({
          id: b.id,
          title: `▸ ${text || "Toggle List"}`,
          snippet: text || "Collapsible toggle block",
          type: "Toggle",
          depth: 1,
          width: 16,
          commandTag: "/toggle",
          iconName: "ChevronRight",
          category: "Lists",
          colorScheme: {
            badgeBg: "bg-neutral-500/15",
            badgeText: "text-neutral-300",
            badgeBorder: "border-neutral-500/30",
            glow: "rgba(163, 163, 163, 0.15)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 11. Bullet & Numbered Lists
      if (type === "bullet" || type === "numbered" || type === "list") {
        list.push({
          id: b.id,
          title: `• ${text || "List Item"}`,
          snippet: text,
          type: type === "numbered" ? "Numbered List" : "Bullet List",
          depth: 1,
          width: 14,
          commandTag: type === "numbered" ? "/number" : "/bullet",
          iconName: type === "numbered" ? "ListOrdered" : "List",
          category: "Lists",
          colorScheme: {
            badgeBg: "bg-cyan-500/15",
            badgeText: "text-cyan-400",
            badgeBorder: "border-cyan-500/30",
            glow: "rgba(34, 211, 238, 0.15)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
        return;
      }

      // 12. Divider
      if (type === "divider" || type === "hr") {
        list.push({
          id: b.id,
          title: "— Divider",
          snippet: "Horizontal divider rule",
          type: "Divider",
          depth: 1,
          width: 12,
          commandTag: "/divider",
          iconName: "Minus",
          category: "Layout",
          colorScheme: {
            badgeBg: "bg-neutral-500/15",
            badgeText: "text-neutral-400",
            badgeBorder: "border-neutral-500/30",
            glow: "rgba(115, 115, 115, 0.15)",
          },
          meta: {},
          rawBlock: b,
        });
        return;
      }

      // 13. Embeds & Links
      if (type === "bookmark" || type === "embed" || type === "link") {
        const url = (props.url as string) || text || "https://...";
        list.push({
          id: b.id,
          title: `🔗 ${url}`,
          snippet: url,
          type: "Embed",
          depth: 1,
          width: 16,
          commandTag: "/embed",
          iconName: "Bookmark",
          category: "Embeds",
          colorScheme: {
            badgeBg: "bg-blue-500/15",
            badgeText: "text-blue-400",
            badgeBorder: "border-blue-500/30",
            glow: "rgba(96, 165, 250, 0.2)",
          },
          meta: { url },
          rawBlock: b,
        });
        return;
      }

      // 14. Standard Paragraphs / Text
      if (text.length > 0) {
        const firstLine = text.split("\n")[0];
        list.push({
          id: b.id,
          title: firstLine.length > 45 ? firstLine.slice(0, 45) + "..." : firstLine,
          snippet: text,
          type: "Text",
          depth: 1,
          width: 14,
          commandTag: "/text",
          iconName: "AlignLeft",
          category: "Basic",
          colorScheme: {
            badgeBg: "bg-neutral-500/15",
            badgeText: "text-neutral-300",
            badgeBorder: "border-neutral-500/30",
            glow: "rgba(163, 163, 163, 0.1)",
          },
          meta: { charCount, wordCount },
          rawBlock: b,
        });
      }
    });

    return list;
  }, [blocks, customSections, pageTitle]);

  // Dynamically calculate ruler position side-by-side with sidebar
  useEffect(() => {
    const updatePosition = () => {
      const container = containerRef?.current;
      if (!container) {
        setRulerPos({
          left: side === "left" ? 260 : window.innerWidth - 32,
          top: window.innerHeight / 2,
          visible: true
        });
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width < 140 || rect.height < 140) {
        setRulerPos((prev) => ({ ...prev, visible: false }));
        return;
      }

      // Position side-by-side directly alongside the sidebar
      const posX = side === "left" ? rect.left + 18 : rect.right - 28;
      const posY = rect.top + rect.height / 2;

      setRulerPos({
        left: Math.max(16, Math.round(posX)),
        top: Math.round(posY),
        visible: true
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      resizeObserver?.disconnect();
    };
  }, [containerRef, side]);

  // Track active section on scroll
  useEffect(() => {
    const container = containerRef?.current || window;
    const handleScroll = () => {
      if (outlineSections.length === 0) return;

      const scrollElement = container === window ? document.documentElement : (container as HTMLElement);
      const containerTop = container === window ? 0 : (container as HTMLElement).getBoundingClientRect().top;

      let foundIndex = -1;
      for (let i = 0; i < outlineSections.length; i++) {
        const sec = outlineSections[i];
        const el = document.querySelector(`[data-block-id="${sec.id}"]`) ||
          document.querySelector(`[data-message-id="${sec.id}"]`) ||
          document.getElementById(sec.id);
        if (el) {
          const elRect = el.getBoundingClientRect();
          if (elRect.top <= containerTop + 160) {
            foundIndex = i;
          } else {
            break;
          }
        }
      }

      if (foundIndex >= 0) {
        setActiveSectionIndex(foundIndex);
      } else {
        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight - scrollElement.clientHeight;
        const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        const newIndex = Math.min(
          Math.floor(progress * outlineSections.length),
          outlineSections.length - 1
        );
        setActiveSectionIndex(Math.max(0, newIndex));
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, outlineSections]);

  if (outlineSections.length < 2) return null;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleHoverRuler = (e: React.MouseEvent, section: OutlineSection, index: number) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setHoverPosition({
      top: rect.top,
      left: rect.left,
      right: rect.right
    });
    setHoveredSection(section);
    setHoveredIndex(index);
  };

  const handleLeaveRuler = () => {
    setHoveredSection(null);
    setHoveredIndex(null);
  };

  const handleClickSection = (section: OutlineSection, index: number) => {
    setActiveSectionIndex(index);
    if (onJumpToSection) {
      onJumpToSection(section.id);
    } else {
      if (section.id === "page-title" && containerRef?.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(`[data-block-id="${section.id}"]`) ||
        document.querySelector(`[data-message-id="${section.id}"]`) ||
        document.getElementById(section.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (containerRef?.current) {
        const scrollEl = containerRef.current;
        const targetScroll = (index / outlineSections.length) * (scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* ─── VERTICAL TICK RULER (SIDE-BY-SIDE WITH SIDEBAR) ─── */}
      <motion.div
        ref={rulerRef}
        onMouseLeave={handleLeaveRuler}
        animate={{
          left: Math.max(16, rulerPos.left),
          top: rulerPos.top,
          opacity: rulerPos.visible ? 1 : 0
        }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        style={{
          position: "fixed",
          transform: "translateY(-50%)",
        }}
        className={`z-40 select-none flex items-center pointer-events-auto ${className}`}
      >
        <div className="flex flex-col items-start gap-0 py-2 cursor-pointer font-mono">
          {outlineSections.map((section, idx) => {
            const isHovered = hoveredIndex === idx;
            const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - idx) === 1;
            const isActive = idx === activeSectionIndex;

            // Proximity dynamic dash width (matching Framer TOC: 12px -> 18px -> 24px)
            let lineWidth = 12;
            let lineBg = "rgb(69, 69, 69)";
            if (isHovered) {
              lineWidth = 24;
              lineBg = "rgb(237, 237, 237)";
            } else if (isNeighbor) {
              lineWidth = 18;
              lineBg = "rgb(160, 160, 160)";
            } else if (isActive && hoveredIndex === null) {
              lineWidth = 20;
              lineBg = "rgb(237, 237, 237)";
            }

            return (
              <div
                key={section.id}
                onClick={() => handleClickSection(section, idx)}
                onMouseEnter={(e) => handleHoverRuler(e, section, idx)}
                className="group flex items-center h-[22px] cursor-pointer gap-2"
              >
                {/* Minimal Dash Line Indicator (Matching Framer: h=3px, r=2px) */}
                <motion.div
                  layout
                  animate={{
                    width: lineWidth,
                    backgroundColor: lineBg,
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 30, bounce: 0.2 }}
                  style={{
                    height: 3,
                    borderRadius: 2,
                  }}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── FLOATING RICH PREVIEW CARD (SHOWS ALL SLASH COMMANDS, BLOCKS & ACTUAL REAL CONTENT) ─── */}
      <AnimatePresence>
        {hoveredSection && hoverPosition && (
          <motion.div
            initial={{ opacity: 0, x: side === "right" ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: side === "right" ? 10 : -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{
              top: Math.max(16, Math.min(window.innerHeight - 280, hoverPosition.top - 24)),
              left: side === "right" ? undefined : hoverPosition.right + 14,
              right: side === "right" ? window.innerWidth - hoverPosition.left + 14 : undefined
            }}
            onClick={() => {
              handleClickSection(hoveredSection, outlineSections.indexOf(hoveredSection));
              setHoveredSection(null);
            }}
            className="fixed z-50 w-80 sm:w-92 p-4 rounded-2xl bg-[#18181b]/98 dark:bg-[#121214]/98 backdrop-blur-2xl border border-white/12 text-white shadow-[0_24px_60px_rgba(0,0,0,0.6)] cursor-pointer hover:border-white/25 transition-all pointer-events-auto select-none"
          >
            {/* 1. Header Row: Slash Command Badge + Block Position */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium tracking-wide border ${hoveredSection.colorScheme.badgeBg} ${hoveredSection.colorScheme.badgeText} ${hoveredSection.colorScheme.badgeBorder}`}>
                  <span>{hoveredSection.commandTag}</span>
                  <span className="opacity-60">·</span>
                  <span>{hoveredSection.type}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10.5px] font-mono text-neutral-400">
                <span>Block {outlineSections.indexOf(hoveredSection) + 1} of {outlineSections.length}</span>
              </div>
            </div>

            {/* 2. Block Title & Headline */}
            <div className="mt-3">
              <div className="text-[13.5px] font-semibold text-white tracking-tight leading-snug break-words">
                {hoveredSection.title || "Untitled Block"}
              </div>
            </div>

            {/* 3. Real Visual Block Skeleton / Interactive Illustration Preview */}
            <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/6 overflow-hidden">
              {/* CODE BLOCK PREVIEW */}
              {hoveredSection.commandTag === "/code" && (
                <div className="font-mono text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400/80 mb-1.5 pb-1 border-b border-white/5">
                    <span>{hoveredSection.meta?.lang || "code"}</span>
                    <span>{hoveredSection.meta?.wordCount || 1} lines</span>
                  </div>
                  <pre className="text-neutral-300 text-[11px] overflow-hidden whitespace-pre-wrap font-mono line-clamp-4">
                    <code>{hoveredSection.snippet}</code>
                  </pre>
                </div>
              )}

              {/* CALLOUT BLOCK PREVIEW */}
              {hoveredSection.commandTag === "/callout" && (
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] leading-relaxed line-clamp-3 text-neutral-200 font-sans">
                    {hoveredSection.snippet}
                  </p>
                </div>
              )}

              {/* TODO / TASK PREVIEW */}
              {hoveredSection.commandTag === "/todo" && (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.04] border border-white/8">
                  {hoveredSection.meta?.checked ? (
                    <CheckSquare size={15} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Square size={15} className="text-neutral-400 shrink-0" />
                  )}
                  <span className={`text-[12px] font-sans ${hoveredSection.meta?.checked ? "line-through text-neutral-400" : "text-neutral-200"} line-clamp-2`}>
                    {hoveredSection.snippet}
                  </span>
                </div>
              )}

              {/* QUOTE PREVIEW */}
              {hoveredSection.commandTag === "/quote" && (
                <div className="flex items-start gap-2.5 pl-2.5 border-l-2 border-rose-500/70 py-1">
                  <p className="text-[12px] italic text-neutral-300 leading-relaxed line-clamp-3 font-serif">
                    “{hoveredSection.snippet}”
                  </p>
                </div>
              )}

              {/* DATABASE / TABLE PREVIEW */}
              {(hoveredSection.commandTag?.startsWith("/table") || hoveredSection.commandTag?.startsWith("/database")) && (
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-2 text-[10.5px] text-teal-400">
                    <Table2 size={13} />
                    <span>Database Grid View</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1.5 rounded bg-white/[0.03] text-[10px] text-neutral-400 font-mono">
                    <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Name</div>
                    <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Status</div>
                    <div className="border-b border-white/10 pb-1 font-semibold text-neutral-300">Tag</div>
                    <div className="truncate text-neutral-400">Item 1</div>
                    <div className="truncate text-emerald-400">Active</div>
                    <div className="truncate text-indigo-400">Main</div>
                  </div>
                </div>
              )}

              {/* AI WORKSPACE PREVIEW */}
              {hoveredSection.commandTag === "/ai" && (
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-purple-500/15 via-fuchsia-500/10 to-transparent border border-purple-500/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-fuchsia-400 mb-1">
                    <Sparkles size={13} />
                    <span>AI Assistant Generation</span>
                  </div>
                  <p className="text-[11.5px] text-neutral-300 leading-relaxed line-clamp-3 font-sans">
                    {hoveredSection.snippet}
                  </p>
                </div>
              )}

              {/* HEADING PREVIEW */}
              {hoveredSection.commandTag?.startsWith("/h") && (
                <div className="p-1 font-sans">
                  <div className={`font-semibold tracking-tight text-white ${hoveredSection.commandTag === "/h1" ? "text-[15px]" :
                      hoveredSection.commandTag === "/h2" ? "text-[14px]" : "text-[13px]"
                    }`}>
                    {hoveredSection.title}
                  </div>
                  {hoveredSection.snippet && hoveredSection.snippet !== hoveredSection.title && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                      {hoveredSection.snippet}
                    </p>
                  )}
                </div>
              )}

              {/* MEDIA / IMAGE PREVIEW */}
              {(hoveredSection.commandTag === "/image" || hoveredSection.commandTag === "/video" || hoveredSection.commandTag === "/file") && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.04]">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                    <ImageIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-white truncate">
                      {hoveredSection.meta?.caption || "Media File"}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {hoveredSection.meta?.url || "Attached resource"}
                    </div>
                  </div>
                </div>
              )}

              {/* MATH FORMULA PREVIEW */}
              {hoveredSection.commandTag === "/math" && (
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center font-mono text-[12px] text-yellow-300">
                  <span>$$ {hoveredSection.snippet || "f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx"} $$</span>
                </div>
              )}

              {/* GENERAL PARAGRAPH / DEFAULT TEXT PREVIEW */}
              {(hoveredSection.commandTag === "/text" || hoveredSection.commandTag === "/bullet" || hoveredSection.commandTag === "/number" || hoveredSection.commandTag === "/toggle" || hoveredSection.commandTag === "/title") && (
                <p className="text-[11.5px] text-neutral-300 font-sans leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
                  {hoveredSection.snippet}
                </p>
              )}

              {/* DIVIDER PREVIEW */}
              {hoveredSection.commandTag === "/divider" && (
                <div className="py-2">
                  <div className="h-[1px] w-full bg-neutral-600 my-1" />
                  <div className="text-center text-[10px] text-neutral-400 font-mono">Horizontal Divider Rule</div>
                </div>
              )}
            </div>

            {/* 4. Footer Metadata & Jump Hint */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-2 border-t border-white/6">
              <span>{hoveredSection.meta?.charCount ? `${hoveredSection.meta.charCount} chars · ${hoveredSection.meta.wordCount || 0} words` : "Block details"}</span>
              <span className="text-neutral-500">Click to jump ↵</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
