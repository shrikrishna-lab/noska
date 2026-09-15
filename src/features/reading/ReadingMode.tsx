import React, { useState, useEffect, useRef } from "react";
import type { CSSProperties, ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  X,
  Play,
  Pause,
  Square,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  Highlighter,
  Sliders,
  ListCollapse,
  Copy,
  Trash2,
  ChevronRight,
  Globe,
  FileText,
  ExternalLink as ExtLink
} from "lucide-react";
import { plainText, renderInlineMarkdown } from "../../utils/helpers";
import type { Page } from "../../lib/supabaseService";
import type { Block } from "../../../types/blocks";
import { PageIcon } from "../../components/PageIcon";
import { LineNavigationRail } from "../navigation/line-nav";
import EmbedBlock from "../../components/editor/EmbedBlock";
import ImageBlock from "../../components/editor/ImageBlock";
import InteractiveBlock from "../../components/editor/interactive/InteractiveBlock";
import LazyBlockEquation from "../../components/editor/LazyBlockEquation";
import LazyMermaidBlock from "../../components/editor/LazyMermaidBlock";
import SimpleTable from "../../components/editor/SimpleTable";
import ColumnsBlock from "../../components/editor/ColumnsBlock";
import ChartBlock from "../../components/editor/ChartBlock";
import DatabaseBlock from "../../components/DatabaseBlock";
import LinkedViewBlock from "../../components/editor/LinkedViewBlock";
import FormsBlock from "../../components/FormsBlock";
import ExternalLinkPreview from "../../components/editor/ExternalLinkPreview";
import WidgetEditorBlock from "../../components/editor/WidgetEditorBlock";
import BlockResizer from "../../components/editor/BlockResizer";
import { BlockRegistry } from "../../registry/BlockRegistry";
import { PlayfulTodoList } from "../../components/ui/playful-todolist";
import { Checkbox } from "../../components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  NOSKA_VOICE_PRESETS,
  findBestVoiceForPreset,
  ELEVENLABS_VOICES,
  getElevenLabsApiKey,
  streamElevenLabsSpeech
} from "../../lib/voice/elevenlabs";

interface ReadingTheme {
  name: string;
  bg: string;
  text: string;
  border: string;
  hover: string;
  accent: string;
  activeBg: string;
  // CSS custom properties (--reading-*) aren't part of React's typed
  // CSSProperties, so this needs the standard "index signature for custom
  // props" escape rather than the plain CSSProperties type used elsewhere.
  styles: CSSProperties & Record<`--reading-${string}`, string>;
}

function childIdsFor(blocks: Block[], parentId: string | null): string[] {
  if (parentId === null) {
    return blocks
      .filter((block) => !block.parentId)
      .map((block) => block.id);
  }
  const parent = blocks.find((block) => block.id === parentId);
  const explicit = Array.isArray(parent?.content)
    ? (parent.content as string[]).filter((id): id is string => typeof id === "string")
    : [];
  const implicit = blocks
    .filter((block) => block.parentId === parentId && !explicit.includes(block.id))
    .map((block) => block.id);
  return [...explicit, ...implicit];
}

function flattenReadingBlocks(blocks: Block[], parentId: string | null = null, depth: number = 0, seen: Set<string> = new Set()): Block[] {
  const active = blocks.filter((b) => !b.isDeleted);
  const byId = new Map(active.map((block) => [block.id, block]));
  const result: Block[] = [];

  for (const id of childIdsFor(active, parentId)) {
    if (seen.has(id)) continue;
    const block = byId.get(id);
    if (!block) continue;
    seen.add(id);
    result.push(block);
    result.push(...flattenReadingBlocks(active, id, depth + 1, seen));
  }

  if (parentId === null) {
    for (const block of active) {
      if (seen.has(block.id)) continue;
      seen.add(block.id);
      result.push(block);
    }
  }

  return result;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

export interface HighlightItem {
  id: string;
  text: string;
  color: HighlightColor;
  createdAt?: number;
}

export type WidthMode = "compact" | "medium" | "wide" | "full";

export const WIDTH_CONFIG: Record<WidthMode, { label: string; maxW: string; icon: string }> = {
  compact: { label: "Compact", maxW: "max-w-[46rem]", icon: "📱" },
  medium: { label: "Comfortable", maxW: "max-w-[62rem]", icon: "📖" },
  wide: { label: "Wide Canvas", maxW: "max-w-[78rem]", icon: "💻" },
  full: { label: "Full Width", maxW: "max-w-full px-4 md:px-12", icon: "🖥️" }
};

export const HIGHLIGHT_COLORS: Record<
  HighlightColor,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  yellow: {
    label: "Yellow",
    bg: "bg-amber-300/40 dark:bg-amber-400/25",
    border: "border-amber-400 dark:border-amber-500",
    text: "text-amber-950 dark:text-amber-100",
    dot: "bg-amber-400"
  },
  green: {
    label: "Green",
    bg: "bg-emerald-300/40 dark:bg-emerald-400/25",
    border: "border-emerald-400 dark:border-emerald-500",
    text: "text-emerald-950 dark:text-emerald-100",
    dot: "bg-emerald-400"
  },
  blue: {
    label: "Blue",
    bg: "bg-sky-300/40 dark:bg-sky-400/25",
    border: "border-sky-400 dark:border-sky-500",
    text: "text-sky-950 dark:text-sky-100",
    dot: "bg-sky-400"
  },
  pink: {
    label: "Pink",
    bg: "bg-rose-300/40 dark:bg-rose-400/25",
    border: "border-rose-400 dark:border-rose-500",
    text: "text-rose-950 dark:text-rose-100",
    dot: "bg-rose-400"
  },
  purple: {
    label: "Purple",
    bg: "bg-purple-300/40 dark:bg-purple-400/25",
    border: "border-purple-400 dark:border-purple-500",
    text: "text-purple-950 dark:text-purple-100",
    dot: "bg-purple-400"
  },
  orange: {
    label: "Orange",
    bg: "bg-orange-300/40 dark:bg-orange-400/25",
    border: "border-orange-400 dark:border-orange-500",
    text: "text-orange-950 dark:text-orange-100",
    dot: "bg-orange-400"
  }
};

function normalizeHighlights(rawHighlights: any[]): HighlightItem[] {
  if (!Array.isArray(rawHighlights)) return [];
  return rawHighlights
    .map((item, idx): HighlightItem | null => {
      if (typeof item === "string") {
        const text = item.trim();
        if (!text) return null;
        return { id: `hl-${idx}-${text.slice(0, 10)}`, text, color: "yellow" };
      }
      if (item && typeof item === "object" && typeof item.text === "string") {
        const text = item.text.trim();
        if (!text) return null;
        const color = (item.color in HIGHLIGHT_COLORS ? item.color : "yellow") as HighlightColor;
        return {
          id: item.id || `hl-${idx}-${text.slice(0, 10)}`,
          text,
          color,
          createdAt: item.createdAt
        };
      }
      return null;
    })
    .filter((h): h is HighlightItem => Boolean(h));
}

function renderHighlightedText(text: string, rawHighlights: any[]) {
  if (!text) return null;
  const activeHighlights = normalizeHighlights(rawHighlights);
  if (activeHighlights.length === 0) {
    return text;
  }

  const sorted = [...activeHighlights].sort((a, b) => b.text.length - a.text.length);
  const escaped = sorted
    .map((h) => h.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  if (!escaped) return text;

  try {
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => {
          const matchedHl = sorted.find(
            (h) => h.text.toLowerCase() === part.toLowerCase()
          );
          if (matchedHl) {
            const conf = HIGHLIGHT_COLORS[matchedHl.color] || HIGHLIGHT_COLORS.yellow;
            return (
              <mark
                key={i}
                className={`${conf.bg} ${conf.text} rounded px-1 py-0.5 border-b-2 ${conf.border} font-medium inline transition-all`}
                title={`Saved Highlight (${conf.label})`}
              >
                {part}
              </mark>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </>
    );
  } catch {
    return text;
  }
}

type ThemeKey = "sepia" | "forest" | "night" | "day";

const THEMES: Record<ThemeKey, ReadingTheme> = {
  sepia: {
    name: "Sepia",
    bg: "bg-[#f5f0e6]",
    text: "text-[#4a3728]",
    border: "border-[#e6dfd0]",
    hover: "hover:bg-[#e8dec9]",
    accent: "bg-[#8c6a5c]",
    activeBg: "bg-[#e6dfd0]",
    styles: {
      "--reading-bg": "#f5f0e6",
      "--reading-text": "#4a3728",
      "--reading-border": "#e6dfd0",
      "--reading-hover": "#e8dec9",
      "--reading-accent": "#8c6a5c"
    }
  },
  forest: {
    name: "Forest",
    bg: "bg-[#141e1b]",
    text: "text-[#e1dcd3]",
    border: "border-[#23342f]",
    hover: "hover:bg-[#293d37]",
    accent: "bg-[#5e8b7e]",
    activeBg: "bg-[#293d37]",
    styles: {
      "--reading-bg": "#141e1b",
      "--reading-text": "#e1dcd3",
      "--reading-border": "#23342f",
      "--reading-hover": "#293d37",
      "--reading-accent": "#5e8b7e"
    }
  },
  night: {
    name: "Night",
    bg: "bg-[#090b0d]",
    text: "text-[#f3f4f6]",
    border: "border-[#1f2937]",
    hover: "hover:bg-[#1e293b]",
    accent: "bg-[#3b82f6]",
    activeBg: "bg-[#1e293b]",
    styles: {
      "--reading-bg": "#090b0d",
      "--reading-text": "#f3f4f6",
      "--reading-border": "#1f2937",
      "--reading-hover": "#1e293b",
      "--reading-accent": "#3b82f6"
    }
  },
  day: {
    name: "Day",
    bg: "bg-[#ffffff]",
    text: "text-[#171717]",
    border: "border-[#e5e5e5]",
    hover: "hover:bg-[#f5f5f5]",
    accent: "bg-[#2563eb]",
    activeBg: "bg-[#f5f5f5]",
    styles: {
      "--reading-bg": "#ffffff",
      "--reading-text": "#171717",
      "--reading-border": "#e5e5e5",
      "--reading-hover": "#f5f5f5",
      "--reading-accent": "#2563eb"
    }
  }
};

export interface ReadingModeProps {
  page: Page;
  pages?: Page[];
  onClose: () => void;
  onPagePatch: (pageId: string, patch: Partial<Page>) => void;
  onSelectPage?: (pageId: string) => void;
}

export default function ReadingMode({ page, pages, onClose, onPagePatch, onSelectPage }: ReadingModeProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [theme, setTheme] = useState<ThemeKey>("sepia");
  const [fontSize, setFontSize] = useState(18); // px font size
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">("serif");
  const [widthMode, setWidthMode] = useState<WidthMode>("medium");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Text-To-Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("noska-natural");

  // Highlights state
  const [selection, setSelection] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState({ top: 0, left: 0 });

  const contentRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const highlights = page.highlights || [];
  const isBookmarked = page.bookmarked || false;

  const activeBlocks = React.useMemo(() => {
    return flattenReadingBlocks(page.blocks || []);
  }, [page.blocks]);

  const fullText = React.useMemo(() => {
    return activeBlocks
      .map((b) => {
        if (b.type === "database") {
          const props = (b as unknown as { properties?: Record<string, unknown> }).properties || {};
          const db = props.view === "table" ? props : { rows: [] as Array<Record<string, unknown>> };
          const rows = (db as { rows?: Array<Record<string, unknown>> }).rows || [];
          return `${b.title || b.text || ""} ${rows.map((r) => Object.values(r).join(" ")).join(" ")}`;
        }
        return b.title || b.text || "";
      })
      .filter(Boolean)
      .join("\n");
  }, [activeBlocks]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load Speech Voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const allVoices = synth.getVoices();
      if (allVoices.length > 0) {
        setVoices(allVoices);
      }
    };
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    return () => {
      synth.cancel();
      utteranceRef.current = null;
    };
  }, []);

  // Dynamic Ruler Position state based on Reading Width Mode
  const [rulerLeft, setRulerLeft] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateRulerPos = () => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        if (widthMode === "full") {
          setRulerLeft(16);
        } else {
          // Position ruler gracefully to the left of the reading canvas (48px margin, min 16px)
          const targetLeft = Math.max(16, Math.floor(rect.left - 48));
          setRulerLeft(targetLeft);
        }
      }
    };

    updateRulerPos();
    const timer = setTimeout(updateRulerPos, 60);

    window.addEventListener("resize", updateRulerPos);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateRulerPos);
      if (contentRef.current) ro.observe(contentRef.current);
      if (containerRef.current) ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRulerPos);
      if (ro) ro.disconnect();
    };
  }, [widthMode, showSidebar]);

  // Update Scroll Progress Bar
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const total = el.scrollHeight - el.clientHeight;
      if (total > 0) {
        setScrollProgress((el.scrollTop / total) * 100);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener("scroll", handleScroll);
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle Text Selection for Highlights
  const handleMouseUp = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (
        text.length > 0 &&
        contentRef.current &&
        (contentRef.current.contains(sel.anchorNode) || contentRef.current.contains(sel.focusNode))
      ) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const container = containerRef.current;
        const containerRect = container ? container.getBoundingClientRect() : { top: 0, left: 0 };
        const scrollTop = container ? container.scrollTop : 0;
        const scrollLeft = container ? container.scrollLeft : 0;

        setSelection(text);
        setSelectionBox({
          top: Math.max(10, rect.top - containerRect.top + scrollTop - 44),
          left: Math.max(80, rect.left - containerRect.left + scrollLeft + rect.width / 2)
        });
      } else {
        setSelection(null);
      }
    }, 15);
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const addHighlightWithColor = (color: HighlightColor = "yellow") => {
    if (!selection) return;
    const cleanSelection = selection.replace(/\r?\n|\r/g, " ").trim();
    if (cleanSelection.length === 0) return;

    const normalized = normalizeHighlights(highlights);
    const existingIdx = normalized.findIndex((h) => h.text.toLowerCase() === cleanSelection.toLowerCase());

    let updated: any[];
    if (existingIdx >= 0) {
      updated = normalized.map((h, i) => (i === existingIdx ? { ...h, color } : h));
    } else {
      updated = [
        ...normalized,
        {
          id: `hl-${Date.now()}`,
          text: cleanSelection,
          color,
          createdAt: Date.now()
        }
      ];
    }

    onPagePatch(page.id, {
      highlights: updated
    });
    clearSelection();
  };

  const removeHighlight = (textToRemove: string) => {
    const normalized = normalizeHighlights(highlights);
    onPagePatch(page.id, {
      highlights: normalized.filter((h) => h.text !== textToRemove && h.id !== textToRemove)
    });
  };

  const scrollToHighlight = (highlightText: string) => {
    if (!containerRef.current) return;
    const marks = containerRef.current.querySelectorAll("mark");
    for (const m of marks) {
      if (m.textContent?.toLowerCase().includes(highlightText.toLowerCase())) {
        m.scrollIntoView({ behavior: "smooth", block: "center" });
        m.classList.add("ring-2", "ring-[var(--reading-accent)]", "brightness-125");
        setTimeout(() => m.classList.remove("ring-2", "ring-[var(--reading-accent)]", "brightness-125"), 2500);
        break;
      }
    }
  };

  // TTS Actions
  const handlePlayTTS = async (customText?: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;

    if (isPaused && !customText) {
      synth?.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    if (synth) synth.cancel();
    const textToSpeak = customText || fullText;
    if (!textToSpeak || textToSpeak.trim().length === 0) return;

    // 1. Check if selected voice is an ElevenLabs studio voice and an API key is configured
    const elevenVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId);
    const elevenKey = getElevenLabsApiKey();
    if (elevenVoice && elevenKey) {
      try {
        setIsSpeaking(true);
        setIsPaused(false);
        await streamElevenLabsSpeech({
          text: textToSpeak,
          voiceId: elevenVoice.id,
          apiKey: elevenKey,
          onAudioStart: () => {
            setIsSpeaking(true);
            setIsPaused(false);
          },
          onAudioEnd: () => {
            setIsSpeaking(false);
            setIsPaused(false);
          }
        });
        return;
      } catch (err) {
        console.warn("ElevenLabs streaming failed, falling back to neural synthesis:", err);
      }
    }

    // 2. Fallback to Noska Voice Neural / System Web Speech with pitch and rate shaping
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance; // Prevent garbage collection bug

    const noskaPreset = NOSKA_VOICE_PRESETS.find((p) => p.id === selectedVoiceId);
    if (noskaPreset) {
      const best = findBestVoiceForPreset(noskaPreset, voices);
      if (best) utterance.voice = best;
      utterance.pitch = noskaPreset.pitch;
      utterance.rate = ttsSpeed * noskaPreset.rate;
    } else {
      const chosenSystemVoice = voices.find((v) => v.name === selectedVoiceId);
      if (chosenSystemVoice) utterance.voice = chosenSystemVoice;
      utterance.rate = ttsSpeed;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        setIsSpeaking(false);
        setIsPaused(false);
      }
      utteranceRef.current = null;
    };

    synth.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePreviewCurrentVoice = () => {
    const elevenVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId);
    if (elevenVoice && elevenVoice.previewUrl) {
      const audio = new Audio(elevenVoice.previewUrl);
      audio.play().catch(() => {
        handlePlayTTS(elevenVoice.previewSampleText || "Hello, this is a voice preview.");
      });
      return;
    }

    const noskaPreset = NOSKA_VOICE_PRESETS.find((p) => p.id === selectedVoiceId);
    if (noskaPreset) {
      handlePlayTTS(noskaPreset.sampleText);
    } else {
      handlePlayTTS("Welcome to Noska. This is a preview of your reading voice.");
    }
  };

  const handlePauseTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  };

  const handleStopTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const toggleBookmark = () => {
    onPagePatch(page.id, {
      bookmarked: !isBookmarked
    });
  };

  const handlePatchBlock = (blockId: string, patch: any) => {
    onPagePatch(page.id, {
      blocks: (page.blocks || []).map((b) => (b.id === blockId ? { ...b, ...patch } : b))
    });
  };

  // Render different block types for styling in Reading Mode
  const renderBlock = (block: Block, index: number = 0) => {
    // Check if category is Embeds in BlockRegistry
    const registryItem = BlockRegistry.find((r) => r.type === block.type);
    if (registryItem?.category === "Embeds") {
      return (
        <BlockResizer
          key={block.id}
          width={block.width}
          height={block.height}
          align={block.align || "center"}
          onPatch={(p) => handlePatchBlock(block.id, p)}
          enableHeightResize={true}
          className="my-4"
        >
          <div id={block.id} data-block-id={block.id} className="w-full">
            <EmbedBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} />
          </div>
        </BlockResizer>
      );
    }

    switch (block.type) {
      case "interactive":
      case "html":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height || 420}
            align={block.align || "left"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-5 mb-8"
          >
            <div id={block.id} data-block-id={block.id} className="w-full h-full">
              <InteractiveBlock
                block={block as any}
                onPatch={(p) => handlePatchBlock(block.id, p)}
                isLocked={false}
              />
            </div>
          </BlockResizer>
        );
      case "image":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <ImageBlock
                block={block as any}
                onPatch={(p) => handlePatchBlock(block.id, p)}
                isLocked={false}
                pages={pages}
                pageId={page.id}
                onNavigate={onSelectPage}
              />
            </div>
          </BlockResizer>
        );
      case "h1":
        return <h1 key={block.id} id={block.id} data-block-id={block.id} className="mt-8 mb-4 text-3xl font-bold font-serif leading-tight text-[var(--reading-text)] whitespace-pre-wrap break-words">{renderHighlightedText(block.text || "Untitled Section", highlights)}</h1>;
      case "h2":
        return <h2 key={block.id} id={block.id} data-block-id={block.id} className="mt-7 mb-3 text-2xl font-semibold font-serif leading-snug text-[var(--reading-text)] border-b border-[var(--reading-border)] pb-1 whitespace-pre-wrap break-words">{renderHighlightedText(block.text || "", highlights)}</h2>;
      case "h3":
        return <h3 key={block.id} id={block.id} data-block-id={block.id} className="mt-6 mb-2 text-xl font-medium font-serif leading-snug text-[var(--reading-text)] whitespace-pre-wrap break-words">{renderHighlightedText(block.text || "", highlights)}</h3>;
      case "h4":
        return <h4 key={block.id} id={block.id} data-block-id={block.id} className="mt-5 mb-1.5 text-lg font-medium font-serif leading-snug text-[var(--reading-text)] whitespace-pre-wrap break-words">{renderHighlightedText(block.text || "", highlights)}</h4>;
      case "quote":
        return (
          <blockquote key={block.id} id={block.id} data-block-id={block.id} className="my-4 border-l-4 border-[var(--reading-accent)] pl-4 italic text-[var(--reading-text)] opacity-90 whitespace-pre-wrap break-words">
            {renderHighlightedText(block.text || "", highlights)}
          </blockquote>
        );
      case "code":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full overflow-hidden rounded-xl border border-[var(--reading-border)] bg-black/5 dark:bg-white/5">
              <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[var(--reading-border)] text-xs opacity-70 font-mono">
                <span>{(block.properties as any)?.language || (block as any).language || "code"}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(block.text || "")}
                  className="hover:opacity-100 flex items-center gap-1 text-[11px] cursor-pointer"
                  title="Copy code"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre className="p-4 font-mono text-sm overflow-x-auto text-[var(--reading-text)]">
                <code>{block.text}</code>
              </pre>
            </div>
          </BlockResizer>
        );
      case "chart":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <ChartBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} />
            </div>
          </BlockResizer>
        );
      case "table":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full overflow-x-auto">
              <SimpleTable block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} />
            </div>
          </BlockResizer>
        );
      case "columns":
      case "2-columns":
      case "3-columns":
      case "4-columns":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <ColumnsBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} />
            </div>
          </BlockResizer>
        );
      case "block-equation":
      case "equation":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full py-2 flex justify-center">
              <LazyBlockEquation text={block.text || ""} displayMode={true} />
            </div>
          </BlockResizer>
        );
      case "mermaid":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <LazyMermaidBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} />
            </div>
          </BlockResizer>
        );
      case "database":
      case "database-inline":
      case "database-full":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <DatabaseBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} page={page} />
            </div>
          </BlockResizer>
        );
      case "linked-view":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <LinkedViewBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} pages={pages} page={page} onNavigate={onSelectPage} />
            </div>
          </BlockResizer>
        );
      case "forms":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <FormsBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} isLocked={false} />
            </div>
          </BlockResizer>
        );
      case "widget":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <WidgetEditorBlock block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} pages={pages} onNavigate={onSelectPage} />
            </div>
          </BlockResizer>
        );
      case "external-preview":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full">
              <ExternalLinkPreview block={block as any} onPatch={(p) => handlePatchBlock(block.id, p)} />
            </div>
          </BlockResizer>
        );
      case "video":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={true}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full rounded-xl overflow-hidden border border-[var(--reading-border)] bg-black">
              <video controls className="w-full max-h-[480px] object-contain" src={block.text}>
                Your browser does not support video.
              </video>
            </div>
          </BlockResizer>
        );
      case "audio":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full rounded-xl border border-[var(--reading-border)] bg-black/5 dark:bg-white/5 p-4 flex items-center gap-4">
              <span className="text-xl">🎵</span>
              <div className="flex-1">
                <audio controls className="w-full h-8" src={block.text} />
              </div>
            </div>
          </BlockResizer>
        );
      case "file":
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full rounded-xl border border-[var(--reading-border)] bg-black/5 dark:bg-white/5 p-4 flex items-center gap-3">
              <span className="text-xl">📎</span>
              <div className="flex-1 truncate text-sm font-medium">{(block as any).name || block.text?.split("/").pop() || "Attached File"}</div>
              {block.text && (
                <a href={block.text} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--reading-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                  Download
                </a>
              )}
            </div>
          </BlockResizer>
        );
      case "bookmark": {
        const url = block.text || (block as any).url || "";
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full rounded-xl border border-[var(--reading-border)] bg-black/5 dark:bg-white/5 p-4">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:opacity-80 transition">
                <Globe size={18} className="text-[var(--reading-accent)]" />
                <span className="text-sm font-medium truncate flex-1">{block.title || url || "Web Link"}</span>
                <ExtLink size={14} className="opacity-60" />
              </a>
            </div>
          </BlockResizer>
        );
      }
      case "page":
      case "link-to-page": {
        const targetId = (block as any).linkedPageId || (block as any).targetPageId || block.id;
        const linked = pages?.find((p) => p.id === targetId);
        return (
          <div key={block.id} id={block.id} data-block-id={block.id} className="my-2">
            <button
              onClick={() => onSelectPage?.(targetId)}
              className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-[var(--reading-text)] underline decoration-[var(--reading-border)] hover:decoration-[var(--reading-accent)] transition cursor-pointer"
            >
              <PageIcon icon={linked?.icon || (block.icon as string | undefined)} size={16} fallback={<FileText size={16} className="opacity-60" />} />
              <span>{linked?.title || block.text || "Linked Page"}</span>
            </button>
          </div>
        );
      }
      case "toggle":
      case "toggle-h1":
      case "toggle-h2":
      case "toggle-h3": {
        return (
          <details key={block.id} id={block.id} data-block-id={block.id} className="my-2 group">
            <summary className="cursor-pointer font-medium text-[var(--reading-text)] flex items-center gap-1.5 py-1 select-none">
              <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
              <span>{renderHighlightedText(block.text || "Toggle", highlights)}</span>
            </summary>
          </details>
        );
      }
      case "callout": {
        const meta = block.meta as { icon?: string } | undefined;
        return (
          <BlockResizer
            key={block.id}
            width={block.width}
            height={block.height}
            align={block.align || "center"}
            onPatch={(p) => handlePatchBlock(block.id, p)}
            enableHeightResize={false}
            className="my-4"
          >
            <div id={block.id} data-block-id={block.id} className="w-full flex gap-3 rounded-lg border border-[var(--reading-border)] bg-black/5 dark:bg-white/5 p-4 text-[var(--reading-text)]">
              {meta?.icon && <PageIcon icon={meta.icon} size={20} fallback="💡" />}
              <div className="flex-1 leading-relaxed whitespace-pre-wrap break-words">{renderHighlightedText(block.text || "", highlights)}</div>
            </div>
          </BlockResizer>
        );
      }
      case "bullet":
        return (
          <li key={block.id} id={block.id} data-block-id={block.id} className="ml-5 list-disc my-1 text-[var(--reading-text)] leading-relaxed whitespace-pre-wrap break-words">
            {renderHighlightedText(block.text || "", highlights)}
          </li>
        );
      case "number":
      case "numbered":
        return (
          <li key={block.id} id={block.id} data-block-id={block.id} className="ml-5 list-decimal my-1 text-[var(--reading-text)] leading-relaxed whitespace-pre-wrap break-words" value={index + 1}>
            {renderHighlightedText(block.text || "", highlights)}
          </li>
        );
      case "todo": {
        const isChecked = (block.properties as any)?.checked !== undefined ? !!(block.properties as any).checked : !!block.checked;
        const todoText = block.text || ((block.properties as any)?.richText ? (block.properties as any).richText.map((r: any) => r.text || "").join("") : "");
        return (
          <div key={block.id} id={block.id} data-block-id={block.id} className="flex items-start gap-2.5 my-2.5 text-[var(--reading-text)] group/read-todo">
            <div className="mt-1 shrink-0">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(val) => {
                  const nextChecked = val === true;
                  handlePatchBlock(block.id, {
                    checked: nextChecked,
                    properties: { ...((block.properties as any) || {}), checked: nextChecked }
                  });
                }}
                className="h-4 w-4 rounded-md border-[var(--reading-border)] data-[state=checked]:bg-[var(--reading-accent)] data-[state=checked]:border-[var(--reading-accent)] transition-all cursor-pointer"
              />
            </div>
            <div className="relative inline-block w-fit max-w-full">
              <span
                onClick={() => {
                  handlePatchBlock(block.id, {
                    checked: !isChecked,
                    properties: { ...((block.properties as any) || {}), checked: !isChecked }
                  });
                }}
                className={`inline-block whitespace-pre-wrap break-words leading-relaxed cursor-pointer select-text transition-opacity duration-300 ${isChecked ? "opacity-60" : "opacity-100"}`}
              >
                {renderHighlightedText(todoText || "To-do item", highlights)}
              </span>
              {/* Playful Animated Strikethrough strictly covering only the text */}
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
                  animate={{
                    pathLength: isChecked ? 1 : 0,
                    opacity: isChecked ? 0.85 : 0
                  }}
                  transition={{
                    pathLength: { duration: 0.35, ease: "easeInOut" },
                    opacity: { duration: 0.01, delay: isChecked ? 0 : 0.3 }
                  }}
                  className="stroke-[var(--reading-text)]"
                />
              </motion.svg>
            </div>
          </div>
        );
      }
      case "playful-todo":
        return (
          <div key={block.id} id={block.id} data-block-id={block.id} className="my-5">
            <PlayfulTodoList />
          </div>
        );
      case "divider":
        return <hr key={block.id} id={block.id} data-block-id={block.id} className="my-6 border-t border-[var(--reading-border)]" />;
      case "text":
      default:
        return (
          <div key={block.id} id={block.id} data-block-id={block.id} className="my-3.5 leading-relaxed text-[var(--reading-text)] whitespace-pre-wrap break-words">
            {renderHighlightedText(block.text || "\u00A0", highlights)}
          </div>
        );
    }
  };

  const selectedTheme = THEMES[theme] || THEMES.sepia;

  return (
    <div
      style={selectedTheme.styles}
      className={`fixed inset-0 z-50 flex flex-col ${selectedTheme.bg} ${selectedTheme.text} transition-colors duration-200 select-text`}
    >
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-black/10 dark:bg-white/10">
        <div
          className="h-full bg-[var(--reading-accent)] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Top Header Controls */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--reading-border)] px-4 bg-black/[0.02] dark:bg-white/[0.02] select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Exit Reading Mode"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--reading-text)] opacity-70">
            <BookOpen size={14} />
            <span>Reading Mode</span>
          </div>
        </div>

        {/* Floating Settings Bar & Bookmarks & Sidebar Toggles */}
        <div className="flex items-center gap-2">
          {/* Quick Width Selector in Header */}
          <div className="hidden sm:flex items-center border border-[var(--reading-border)] rounded-lg p-0.5 bg-black/[0.03] dark:bg-white/[0.03] text-[11px]">
            {(["compact", "medium", "wide", "full"] as WidthMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setWidthMode(mode)}
                className={`px-2 py-0.5 rounded-md capitalize font-medium transition-all cursor-pointer ${
                  widthMode === mode
                    ? "bg-[var(--reading-accent)] text-white shadow-xs"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={`Reading width: ${WIDTH_CONFIG[mode].label}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* TTS Controls Directly Available */}
          <div className="flex items-center border-r border-[var(--reading-border)] pr-2 mr-1 gap-1">
            <button
              onClick={isSpeaking ? handlePauseTTS : () => handlePlayTTS()}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--reading-text)] transition cursor-pointer"
              title={isSpeaking ? "Pause Audio" : "Play Text-To-Speech"}
            >
              {isSpeaking ? <Pause size={15} /> : <Play size={15} />}
            </button>
            {(isSpeaking || isPaused) && (
              <button
                onClick={handleStopTTS}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--reading-text)] transition cursor-pointer"
                title="Stop Audio"
              >
                <Square size={14} />
              </button>
            )}
          </div>

          <button
            onClick={toggleBookmark}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-[var(--reading-text)]"
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            {isBookmarked ? (
              <Bookmark className="fill-[var(--reading-accent)] text-[var(--reading-accent)]" size={17} />
            ) : (
              <BookmarkPlus size={17} />
            )}
          </button>

          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowSidebar(false);
            }}
            className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition ${
              showSettings ? "bg-black/5 dark:bg-white/5" : ""
            }`}
            title="Formatting & Voice Settings"
          >
            <Sliders size={16} />
          </button>

          <button
            onClick={() => {
              setShowSidebar(!showSidebar);
              setShowSettings(false);
            }}
            className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition ${
              showSidebar ? "bg-black/5 dark:bg-white/5" : ""
            }`}
            title="View Highlights & Bookmarks"
          >
            <ListCollapse size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Outline Ruler for Reading Mode */}
        <div className="hidden md:block z-30 pointer-events-auto">
          <LineNavigationRail
            pages={pages && pages.length > 0 ? pages : [page]}
            activeId={page.id}
            appView="page"
            position="left"
            offsetX={rulerLeft}
            sidebarOpen={false}
            onSelectPage={(id) => {
              if (onSelectPage && id !== page.id) {
                onSelectPage(id);
              }
            }}
          />
        </div>

        {/* Left/Right settings sidebar overlay */}
        {showSettings && (
          <div className="absolute right-4 top-2 z-40 w-80 rounded-xl border border-[var(--reading-border)] bg-[var(--reading-bg)] shadow-2xl p-4 flex flex-col gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Theme</h4>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(THEMES) as [ThemeKey, ReadingTheme][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium border border-transparent transition ${
                      theme === key ? "border-[var(--reading-accent)] bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full ${value.bg} border border-[var(--reading-border)] mb-1`} />
                    <span className="opacity-80">{value.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Reading Width</h4>
              <div className="grid grid-cols-4 gap-1.5">
                {(["compact", "medium", "wide", "full"] as WidthMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setWidthMode(mode)}
                    className={`py-1.5 text-center text-xs font-medium rounded-lg border border-[var(--reading-border)] transition capitalize ${
                      widthMode === mode ? "bg-[var(--reading-accent)] text-white shadow-xs" : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Font Typography</h4>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setFontFamily("serif")}
                  className={`py-1.5 text-center text-xs font-serif font-semibold rounded-lg border border-[var(--reading-border)] transition ${
                    fontFamily === "serif" ? "bg-[var(--reading-accent)] text-white shadow-xs" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Serif
                </button>
                <button
                  onClick={() => setFontFamily("sans")}
                  className={`py-1.5 text-center text-xs font-sans font-semibold rounded-lg border border-[var(--reading-border)] transition ${
                    fontFamily === "sans" ? "bg-[var(--reading-accent)] text-white shadow-xs" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Sans
                </button>
                <button
                  onClick={() => setFontFamily("mono")}
                  className={`py-1.5 text-center text-xs font-mono font-semibold rounded-lg border border-[var(--reading-border)] transition ${
                    fontFamily === "mono" ? "bg-[var(--reading-accent)] text-white shadow-xs" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Mono
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Typography Details</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Size: {fontSize}px</span>
                  <div className="flex border border-[var(--reading-border)] rounded overflow-hidden">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className="px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="px-2.5 py-1 border-l border-[var(--reading-border)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Line spacing: {lineHeight.toFixed(1)}</span>
                  <div className="flex border border-[var(--reading-border)] rounded overflow-hidden">
                    <button
                      onClick={() => setLineHeight(Math.max(1.2, lineHeight - 0.2))}
                      className="px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Narrow
                    </button>
                    <button
                      onClick={() => setLineHeight(Math.min(2.2, lineHeight + 0.2))}
                      className="px-2.5 py-1 border-l border-[var(--reading-border)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60">
                  Voice & Audio Reader
                </h4>
                <button
                  onClick={handlePreviewCurrentVoice}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--reading-accent)] hover:opacity-80 transition cursor-pointer"
                  title="Test voice audio preview"
                >
                  <Play size={11} className="fill-[var(--reading-accent)]" />
                  <span>Test Voice</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--reading-text)] opacity-70">Voice Model</span>
                  <select
                    className="w-full text-xs p-1.5 rounded-lg border border-[var(--reading-border)] bg-[var(--reading-bg)] text-[var(--reading-text)] outline-none font-medium cursor-pointer"
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                  >
                    <optgroup label="🌟 Noska Voice (Neural AI - Free)">
                      {NOSKA_VOICE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.accent}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="⚡ ElevenLabs Studio AI">
                      {ELEVENLABS_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.category} · {v.accent || "Studio"})
                        </option>
                      ))}
                    </optgroup>
                    {voices.length > 0 && (
                      <optgroup label="💻 System Installed Voices">
                        {voices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-[var(--reading-text)] opacity-70">
                    <span>Reading Speed</span>
                    <span>{ttsSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[var(--reading-accent)] bg-black/10 dark:bg-white/10 h-1 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Side Panel: Highlights and Bookmarks */}
        {showSidebar && (
          <div className="absolute right-4 top-2 z-40 w-80 h-[80%] rounded-xl border border-[var(--reading-border)] bg-[var(--reading-bg)] shadow-2xl p-4 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--reading-border)] pb-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-70 flex items-center gap-1.5">
                <Highlighter size={13} />
                <span>Notes & Highlights ({highlights.length})</span>
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 select-text">
              {normalizeHighlights(highlights).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Highlighter size={28} className="opacity-30 mb-2" />
                  <p className="text-xs text-[var(--reading-text)] opacity-50">Select any text inside the reader and choose a color to save highlights here.</p>
                </div>
              ) : (
                normalizeHighlights(highlights).map((item) => {
                  const conf = HIGHLIGHT_COLORS[item.color] || HIGHLIGHT_COLORS.yellow;
                  return (
                    <div
                      key={item.id}
                      onClick={() => scrollToHighlight(item.text)}
                      className={`p-3 rounded-xl border border-[var(--reading-border)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] flex flex-col gap-2 transition group relative cursor-pointer border-l-4 ${conf.border}`}
                    >
                      <div className="flex items-center justify-between text-[11px] opacity-70">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          {(["yellow", "green", "blue", "pink", "purple", "orange"] as HighlightColor[]).map((c) => (
                            <button
                              key={c}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = normalizeHighlights(highlights).map((h) =>
                                  h.id === item.id ? { ...h, color: c } : h
                                );
                                onPagePatch(page.id, { highlights: next });
                              }}
                              className={`w-3.5 h-3.5 rounded-full ${HIGHLIGHT_COLORS[c].dot} hover:scale-125 transition-transform`}
                              title={`Change to ${HIGHLIGHT_COLORS[c].label}`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs italic leading-relaxed text-[var(--reading-text)]">"{item.text}"</p>

                      <div className="flex items-center justify-end gap-1 pt-1 opacity-0 group-hover:opacity-100 transition border-t border-[var(--reading-border)]/40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.text);
                          }}
                          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[var(--reading-text)] opacity-70 hover:opacity-100 transition cursor-pointer"
                          title="Copy Highlight"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTTS(item.text);
                          }}
                          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[var(--reading-text)] opacity-70 hover:opacity-100 transition cursor-pointer"
                          title="Listen to highlight"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHighlight(item.id);
                          }}
                          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-rose-500 hover:text-rose-600 transition cursor-pointer"
                          title="Delete Highlight"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Main Text Content Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center py-10 px-6 scrollbar-thin relative"
        >
          {/* Highlight tooltip menu button */}
          {selection && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                top: `${selectionBox.top}px`,
                left: `${selectionBox.left}px`,
                transform: "translateX(-50%)"
              }}
              className="absolute z-[999] flex items-center gap-1 p-1 rounded-xl bg-[var(--reading-bg)] text-[var(--reading-text)] shadow-2xl animate-in zoom-in-95 duration-100 select-none border border-[var(--reading-border)]"
            >
              {/* Color swatches */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 border-r border-[var(--reading-border)]">
                {(Object.entries(HIGHLIGHT_COLORS) as [HighlightColor, typeof HIGHLIGHT_COLORS[HighlightColor]][]).map(
                  ([colorKey, colorConf]) => (
                    <button
                      key={colorKey}
                      onClick={() => addHighlightWithColor(colorKey)}
                      className={`h-5 w-5 rounded-full ${colorConf.dot} border border-black/20 hover:scale-110 active:scale-95 transition-transform cursor-pointer shadow-sm relative`}
                      title={`Highlight in ${colorConf.label}`}
                    />
                  )
                )}
              </div>

              <button
                onClick={() => addHighlightWithColor("yellow")}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                title="Highlight Selection"
              >
                <Highlighter size={13} />
                <span>Highlight</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selection);
                  clearSelection();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                title="Copy Text"
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>
              <button
                onClick={() => {
                  handlePlayTTS(selection);
                  clearSelection();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-[var(--reading-accent)]"
                title="Listen to selection"
              >
                <Play size={13} />
                <span>Listen</span>
              </button>
            </div>
          )}

          <article
            ref={contentRef}
            onMouseUp={handleMouseUp}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight
            }}
            className={`w-full ${WIDTH_CONFIG[widthMode].maxW} ${
              fontFamily === "serif"
                ? "font-serif"
                : fontFamily === "mono"
                ? "font-mono"
                : "font-sans"
            } transition-[font-size,line-height,max-width] duration-150 selection:bg-[var(--reading-accent)]/30`}
          >
            {/* Cover and Header */}
            {Boolean(page.cover) && (
              <div
                className="w-full h-44 rounded-xl overflow-hidden mb-6 select-none border border-[var(--reading-border)] shadow-sm transition-all"
                style={{
                  background: page.cover?.startsWith("linear-gradient")
                    ? page.cover
                    : `url(${page.cover}) ${page.coverPosition || "center"}/cover no-repeat`,
                  filter: page.coverBlur ? `blur(${page.coverBlur}px)` : "none"
                }}
              />
            )}

            <header id="page-title" data-block-id="page-title" className="mb-8 border-b border-[var(--reading-border)] pb-5 select-none">
              <div className="flex items-center gap-2.5 mb-3">
                <PageIcon icon={page.icon} size={36} fallback={<span className="text-4xl">📄</span>} />
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--reading-text)]">
                  {page.title || "Untitled Note"}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--reading-text)] opacity-60">
                {isBookmarked && (
                  <span className="flex items-center gap-1 text-[var(--reading-accent)] font-semibold">
                    <Bookmark size={12} className="fill-[var(--reading-accent)]" />
                    Bookmarked
                  </span>
                )}
                <span>{fullText.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>·</span>
                <span>{Math.max(1, Math.ceil(fullText.trim().split(/\s+/).filter(Boolean).length / 220))} min read</span>
              </div>
            </header>

            {/* Document Blocks Content */}
            <div className="space-y-1">
              {activeBlocks && activeBlocks.length > 0 ? (
                activeBlocks.map((block, idx) => renderBlock(block, idx))
              ) : (
                <p className="italic opacity-50">Empty document</p>
              )}
            </div>

            {/* Generous bottom spacing buffer so content & todo blocks never clip at the bottom */}
            <div className="h-44 w-full shrink-0" />
          </article>
        </div>
      </div>
    </div>
  );
}
