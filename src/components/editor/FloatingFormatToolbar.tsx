import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  Code,
  Strikethrough,
  Eraser,
  Palette,
  GripVertical,
  Link,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Smile,
  Highlighter,
  Sparkles,
  Check,
  Lightbulb,
  FileEdit,
  Globe,
  Scissors,
  Plus,
  Loader2,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import { runAI } from "../../utils/ai";
import { customPrompt } from "../../lib/custom-dialogs";

const TEXT_COLORS = [
  { name: "Default", var: "default", color: "var(--text)" },
  { name: "Gray", var: "gray", color: "#9ca3af" },
  { name: "Brown", var: "brown", color: "#a16207" },
  { name: "Orange", var: "orange", color: "#f97316" },
  { name: "Yellow", var: "yellow", color: "#eab308" },
  { name: "Green", var: "green", color: "#22c55e" },
  { name: "Teal", var: "teal", color: "#14b8a6" },
  { name: "Blue", var: "blue", color: "#3b82f6" },
  { name: "Indigo", var: "indigo", color: "#6366f1" },
  { name: "Purple", var: "purple", color: "#a855f7" },
  { name: "Pink", var: "pink", color: "#ec4899" },
  { name: "Red", var: "red", color: "#ef4444" },
];

const BLOCK_TYPES = [
  { key: "text", label: "Text", icon: "¶" },
  { key: "h1", label: "Heading 1", icon: "H1" },
  { key: "h2", label: "Heading 2", icon: "H2" },
  { key: "h3", label: "Heading 3", icon: "H3" },
  { key: "bullet", label: "Bulleted list", icon: "•" },
  { key: "number", label: "Numbered list", icon: "1." },
  { key: "todo", label: "To-do list", icon: "☑" },
  { key: "quote", label: "Quote", icon: "”" },
  { key: "code", label: "Code block", icon: "<>" },
  { key: "callout", label: "Callout", icon: "💡" },
  { key: "math", label: "Math equation", icon: "√x" },
];

const EMOJI_REACTIONS = ["👍", "❤️", "🔥", "✅", "💡", "🚀"];

function getActiveEditable(): Element | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const node = sel.anchorNode;
  if (!node) return null;
  const editable =
    node.nodeType === 3
      ? node.parentElement?.closest("[contentEditable]")
      : (node as Element).closest?.("[contentEditable]");
  return editable || null;
}

function getSelectedText(): string {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return "";
  return sel.toString().trim();
}

function getSelRect(): DOMRect | null {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    return sel.getRangeAt(0).getBoundingClientRect();
  } catch {
    return null;
  }
}

function applyExecCommand(cmd: string) {
  if (cmd === "bold") document.execCommand("bold", false, null);
  else if (cmd === "italic") document.execCommand("italic", false, null);
  else if (cmd === "underline") document.execCommand("underline", false, null);
  else if (cmd === "strikethrough") document.execCommand("strikeThrough", false, null);
  else if (cmd === "code") {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const text = sel.toString();
      document.execCommand("insertHTML", false, "`" + text + "`");
    }
  } else if (cmd === "clear") {
    document.execCommand("removeFormat", false, null);
  } else if (cmd?.startsWith("color-")) {
    const isBg = cmd.includes("bg-");
    const colorVar = cmd.replace("color-", "").replace("bg-", "");
    document.execCommand("styleWithCSS", false, true as unknown as string);
    if (isBg) {
      document.execCommand("backColor", false, `var(--clr-bg-${colorVar})`);
    } else {
      document.execCommand("foreColor", false, `var(--clr-${colorVar})`);
    }
  }
}

export interface SelectionStateLike {
  text: string;
  rect: { top: number; left: number; width?: number; height?: number } | null;
  blockId?: string | null;
  selStart?: number;
  selEnd?: number;
}

interface FloatingFormatToolbarProps {
  selection?: SelectionStateLike | null;
  blockId?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onFormat?: (formatKey: string) => void;
  onReplace?: (text: string) => void;
  onInsert?: (text: string) => void;
  onTurnInto?: (type: string) => void;
  onComment?: () => void;
  onClose?: () => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
}

export default function FloatingFormatToolbar({
  selection,
  blockId,
  inputRef,
  onFormat,
  onReplace,
  onInsert,
  onTurnInto,
  onComment,
  onClose,
  apiKey,
  aiProvider,
  nvidiaKey,
}: FloatingFormatToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [opensUpward, setOpensUpward] = useState(true);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [colorTab, setColorTab] = useState<"text" | "bg">("text");
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Cached text for persistent AI operations
  const [cachedText, setCachedText] = useState("");

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  // Position calculation & text caching
  useEffect(() => {
    const text = selection?.text || getSelectedText();
    if (text) setCachedText(text);

    const activeRect = selection?.rect || (selection ? null : getSelRect());
    const hasText = Boolean(text);

    if (hasText && activeRect && (activeRect.width === undefined || activeRect.width >= 0)) {
      let top = activeRect.top - 46;
      let left = activeRect.left + (activeRect.width || 0) / 2 - 150;

      if (top < 60) {
        top = activeRect.top + (activeRect.height || 22) + 8;
      }

      const hasUpwardRoom = top > 340;
      setOpensUpward(hasUpwardRoom);

      setPos({
        top: Math.max(10, Math.round(top)),
        left: Math.max(16, Math.min(Math.round(left), window.innerWidth - 340)),
      });
      setVisible(true);
    } else if (!expanded) {
      setVisible(false);
    }
  }, [selection, expanded]);

  // Outside click dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
        setExpanded(false);
        setColorOpen(false);
        setTypeDropdownOpen(false);
        setEmojiOpen(false);
        onClose?.();
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", handler), 50);
    return () => document.removeEventListener("pointerdown", handler);
  }, [visible, onClose]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        setExpanded(false);
        onClose?.();
      } else if (e.altKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => aiInputRef.current?.focus(), 80);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  // AI execution engine
  const handleRunAI = async (skillPrompt: string, skillName?: string) => {
    const selected = selection?.text || cachedText || getSelectedText();
    if (!selected) return;

    setAiLoading(true);
    setActiveSkill(skillName || "Custom");
    setAiResult("");

    try {
      const response = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey: nvidiaKey,
        system:
          "You are an expert editor inside the Noska note workspace. Provide only the polished or requested text back directly without any conversational intros or markdown wrapping.",
        prompt: `${skillPrompt}\n\nSelected text:\n"${selected}"`,
      });
      setAiResult(response.trim());
    } catch {
      setAiResult("AI request failed. Please check your API key in Settings.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyFormat = (formatKey: string) => {
    if (formatKey === "color") {
      setColorOpen((v) => !v);
      return;
    }
    if (formatKey === "link") {
      customPrompt("Enter URL for link:", "https://").then((url) => {
        if (url) {
          document.execCommand("createLink", false, url);
          onFormat?.(`[${selection?.text || cachedText || "link"}](${url})`);
        }
      });
      return;
    }

    const sel = window.getSelection();
    const hasSel = sel && !sel.isCollapsed && sel.rangeCount > 0;
    let savedRange: Range | null = null;
    if (hasSel) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    const editable = getActiveEditable();
    if (editable) {
      applyExecCommand(formatKey);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      onFormat?.(formatKey);
    }

    if (savedRange) {
      sel!.removeAllRanges();
      sel!.addRange(savedRange);
    }
  };

  const handleApplyColor = (colorVar: string) => {
    const prefix = colorTab === "bg" ? "bg-" : "";
    const editable = getActiveEditable();
    if (editable) {
      applyExecCommand(`color-${prefix}${colorVar}`);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      onFormat?.(`color-${prefix}${colorVar}`);
    }
    setColorOpen(false);
  };

  if (!visible) return null;

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 26, stiffness: 420 }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[160] flex flex-col items-start select-none font-sans"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* ─── Expandable Full Rich Notion/Craft Style Menu Card (Opens UPWARD by Default) ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: opensUpward ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: opensUpward ? 6 : -6 }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`w-80 rounded-[28px] border border-white/50 dark:border-white/15 bg-white/90 dark:bg-[#18181b]/92 backdrop-blur-3xl p-3.5 text-[var(--text)] space-y-3 z-[170] shadow-[0_30px_70px_rgba(0,0,0,0.22),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] ${
              opensUpward ? "absolute bottom-full mb-3 left-0" : "mt-3"
            }`}
          >
            {/* Top Drag Header & Block Type Dropdown (Text ˇ) */}
            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-black/[0.06] dark:border-white/10">
              {/* Draggable Card Header Handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl cursor-grab active:cursor-grabbing hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition text-[var(--text-secondary)]"
                title="Drag to move menu"
              >
                <GripVertical size={13} className="text-[var(--muted)]" />
                <span className="text-[11px] font-bold tracking-tight">AI & Formatting</span>
              </div>

              {/* Block Type Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTypeDropdownOpen((v) => !v);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] transition cursor-pointer border border-black/[0.05] dark:border-white/10 shadow-xs"
                >
                  <span>Text</span>
                  <ChevronDown size={12} className="text-[var(--text-secondary)]" />
                </button>

                {typeDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-44 rounded-2xl border border-white/40 dark:border-white/15 bg-white/98 dark:bg-[#1c1c1f]/98 backdrop-blur-2xl shadow-2xl p-1.5 space-y-0.5 z-30 max-h-52 overflow-y-auto scrollbar-thin">
                    {BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.key}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTurnInto?.(bt.key);
                          setTypeDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition cursor-pointer text-left font-medium"
                      >
                        <span className="w-4 text-center text-[var(--text-secondary)] font-mono text-[11px]">
                          {bt.icon}
                        </span>
                        <span>{bt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(false);
                }}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Row 2: Comprehensive Formatting Grid Icons (Apple Glass Buttons) */}
            <div className="grid grid-cols-5 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setColorOpen((v) => !v)}
                className="h-7 rounded-xl flex items-center justify-center font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition cursor-pointer shadow-2xs"
                title="Color & Highlight"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("bold")}
                className="h-7 rounded-xl flex items-center justify-center font-bold hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("italic")}
                className="h-7 rounded-xl flex items-center justify-center italic font-serif hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("underline")}
                className="h-7 rounded-xl flex items-center justify-center underline hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Underline"
              >
                U
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("clear")}
                className="h-7 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Clear format"
              >
                Tx
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat("link")}
                className="h-7 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Insert Link"
              >
                <Link size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("strikethrough")}
                className="h-7 rounded-xl flex items-center justify-center line-through text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Strikethrough"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormat("code")}
                className="h-7 rounded-xl flex items-center justify-center font-mono text-[11px] text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Inline Code"
              >
                &lt;&gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  const sel = selection?.text || cachedText || getSelectedText();
                  if (sel) handleApplyFormat(`$${sel}$`);
                }}
                className="h-7 rounded-xl flex items-center justify-center font-serif text-[11px] text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Math Equation"
              >
                √x
              </button>
              <button
                type="button"
                onClick={() => setColorOpen((v) => !v)}
                className="h-7 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition cursor-pointer"
                title="Color Palette"
              >
                <Palette size={13} />
              </button>
            </div>

            {/* Row 3: Action Buttons (Comment, Reaction, Highlight) */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] text-xs text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => onComment?.()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:text-[var(--text)] transition cursor-pointer font-medium"
              >
                <MessageSquare size={13} className="text-[var(--accent)]" />
                <span>Comment</span>
              </button>

              <div className="relative flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="p-1.5 rounded-xl hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:text-[var(--text)] transition cursor-pointer"
                  title="Emoji Reaction"
                >
                  <Smile size={14} />
                </button>

                {emojiOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 p-1 rounded-full bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl flex gap-1 z-30">
                    {EMOJI_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const editable = getActiveEditable();
                          if (editable) {
                            document.execCommand("insertText", false, emoji);
                          }
                          setEmojiOpen(false);
                        }}
                        className="h-6 w-6 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.15] flex items-center justify-center text-xs cursor-pointer transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleApplyColor("yellow")}
                  className="p-1.5 rounded-xl hover:bg-black/[0.06] dark:hover:bg-white/[0.1] hover:text-[var(--text)] transition cursor-pointer"
                  title="Quick Highlight"
                >
                  <Highlighter size={14} className="text-amber-500" />
                </button>
              </div>
            </div>

            {/* Row 4: SKILLS Section (AI Workflows) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1.5">
                <span>SKILLS</span>
                <span className="text-[9px] opacity-70">AI WRITING FLOW</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRunAI("Improve writing, clarity, vocabulary, and flow:", "Improve")}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.12] transition cursor-pointer text-left border border-transparent hover:border-black/[0.06] dark:hover:border-white/10 shadow-xs"
                >
                  <span className="text-amber-500">✨</span>
                  <span className="truncate font-semibold">Improve</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAI("Proofread and correct all grammar, spelling, and punctuation errors:", "Proofread")}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.12] transition cursor-pointer text-left border border-transparent hover:border-black/[0.06] dark:hover:border-white/10 shadow-xs"
                >
                  <span className="text-emerald-500">✓</span>
                  <span className="truncate font-semibold">Proofread</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAI("Explain this concept simply and concisely:", "Explain")}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.12] transition cursor-pointer text-left border border-transparent hover:border-black/[0.06] dark:hover:border-white/10 shadow-xs"
                >
                  <span className="text-blue-500">💡</span>
                  <span className="truncate font-semibold">Explain</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAI("Reformat into clean markdown with headers and bullet points:", "Reformat")}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.12] transition cursor-pointer text-left border border-transparent hover:border-black/[0.06] dark:hover:border-white/10 shadow-xs"
                >
                  <span className="text-purple-500">📝</span>
                  <span className="truncate font-semibold">Reformat</span>
                </button>
              </div>
            </div>

            {/* AI Result Card with Replace / Insert / Copy */}
            {aiLoading && (
              <div className="flex items-center justify-center gap-2 py-3.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.06] dark:border-white/10 text-xs text-[var(--accent)] font-medium">
                <Loader2 size={14} className="animate-spin" />
                <span>Running {activeSkill}...</span>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div className="p-3 rounded-2xl border border-[var(--accent)]/30 bg-black/[0.03] dark:bg-white/[0.06] space-y-2 text-xs">
                <div className="text-[11px] font-semibold text-[var(--accent)] flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>{activeSkill} Result</span>
                </div>
                <div className="max-h-28 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap scrollbar-thin">
                  {aiResult}
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onReplace?.(aiResult);
                      setAiResult("");
                      setExpanded(false);
                    }}
                    className="px-3 py-1 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onInsert?.(aiResult);
                      setAiResult("");
                      setExpanded(false);
                    }}
                    className="px-2.5 py-1 rounded-xl border border-black/[0.1] dark:border-white/15 hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[11px] font-medium transition cursor-pointer"
                  >
                    Insert Below
                  </button>
                </div>
              </div>
            )}

            {/* Row 5: "Edit with AI" Prompt Input Box (Matching Image 3) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (aiPrompt.trim()) {
                  handleRunAI(aiPrompt.trim(), "Edit");
                  setAiPrompt("");
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="relative flex items-center rounded-2xl border border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] px-3 py-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition gap-2"
            >
              <span className="text-[10px] font-bold tracking-tight text-amber-500 select-none uppercase">AI</span>
              <input
                ref={aiInputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (aiPrompt.trim()) {
                      handleRunAI(aiPrompt.trim(), "Edit");
                      setAiPrompt("");
                    }
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder='Edit, expand, or rewrite ""'
                className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none pr-14 select-text cursor-text"
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim()}
                className="absolute right-2 px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition cursor-pointer"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Compact Floating Pill Toolbar (Apple Glass Style + Draggable) ─── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 rounded-full border border-white/60 dark:border-white/15 bg-white/85 dark:bg-[#18181b]/88 backdrop-blur-2xl px-2 py-1 shadow-[0_20px_50px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.15)]"
      >
        {/* Draggable Grip Handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex items-center justify-center h-6 w-4 cursor-grab active:cursor-grabbing text-[var(--muted)] hover:text-[var(--text)] transition"
          title="Drag toolbar anywhere"
        >
          <GripVertical size={13} />
        </div>

        {/* Quick Format Actions */}
        <button
          type="button"
          onClick={() => handleApplyFormat("bold")}
          title="Bold (Ctrl+B)"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer"
        >
          <Bold size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleApplyFormat("italic")}
          title="Italic (Ctrl+I)"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer"
        >
          <Italic size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleApplyFormat("underline")}
          title="Underline (Ctrl+U)"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer"
        >
          <Underline size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleApplyFormat("strikethrough")}
          title="Strikethrough"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer"
        >
          <Strikethrough size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleApplyFormat("code")}
          title="Inline Code"
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition cursor-pointer"
        >
          <Code size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleApplyFormat("color")}
          title="Color & Highlight"
          className={`flex h-6 w-6 items-center justify-center rounded-full transition cursor-pointer ${
            colorOpen ? "bg-[var(--accent)] text-white" : "text-[var(--text)] hover:bg-black/[0.06] dark:hover:bg-white/[0.12]"
          }`}
        >
          <Palette size={12} />
        </button>

        <div className="h-3.5 w-[1px] bg-black/[0.08] dark:bg-white/10 mx-0.5" />

        {/* Expand Button: Spark Logo + More (Prevents Selection Loss) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={`flex items-center justify-center h-6 px-2.5 gap-1.5 rounded-full transition cursor-pointer ${
            expanded
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
          }`}
          title="AI Skills & Extended Menu (Alt+Shift+E)"
        >
          <Sparkles size={12} className={expanded ? "text-white" : "text-amber-500"} />
          <span className="text-[10px] font-bold leading-none">⋯</span>
        </button>
      </div>

      {/* Color Palette Popover */}
      {colorOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-64 rounded-2xl border border-white/40 dark:border-white/15 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-2xl p-2.5 shadow-2xl z-[180] ${
            opensUpward ? "absolute bottom-full mb-2 left-0" : "mt-2"
          }`}
        >
          <div className="flex border-b border-black/[0.06] dark:border-white/10 mb-2">
            <button
              type="button"
              onClick={() => setColorTab("text")}
              className={`flex-1 py-1 text-xs font-medium cursor-pointer ${
                colorTab === "text"
                  ? "border-b-2 border-[var(--accent)] text-[var(--text)] font-semibold"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              Text Color
            </button>
            <button
              type="button"
              onClick={() => setColorTab("bg")}
              className={`flex-1 py-1 text-xs font-medium cursor-pointer ${
                colorTab === "bg"
                  ? "border-b-2 border-[var(--accent)] text-[var(--text)] font-semibold"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              Background
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto pr-1">
            {TEXT_COLORS.map(({ name, var: colorVar, color }) => (
              <button
                key={colorVar}
                type="button"
                onClick={() => handleApplyColor(colorVar)}
                className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs hover:bg-black/[0.06] dark:hover:bg-white/[0.1] cursor-pointer text-left transition"
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0 border border-black/10 shadow-xs"
                  style={{
                    backgroundColor: colorTab === "bg" ? `var(--clr-bg-${colorVar}, ${color})` : color,
                  }}
                />
                <span className="truncate text-[11px]">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
