import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Square,
  RotateCcw,
  Check,
  X,
  Loader2,
  AtSign,
  Rows,
  FileText,
  Hash,
  Sparkles,
} from "lucide-react";
import { runAI } from "../../utils/ai";
import { aiManager } from "../../ai/AIManager";
import { PageIcon } from "../PageIcon";

interface NotionAIBarProps {
  blockId: string;
  blockText?: string;
  pageContext?: string;
  position: { top: number; left: number };
  onClose: () => void;
  onReplace: (newText: string) => void;
  onInsertBelow: (newText: string) => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
}

export default function NotionAIBar({
  blockId,
  blockText = "",
  pageContext = "",
  position,
  onClose,
  onReplace,
  onInsertBelow,
  apiKey,
  aiProvider,
  nvidiaKey,
}: NotionAIBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [loadingText, setLoadingText] = useState("Focusing");
  const [isConversational, setIsConversational] = useState(false);
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Load workspace pages for @ mentions (filtering out corrupt data URIs)
  const workspacePages = useMemo(() => {
    try {
      const stored = localStorage.getItem("pages");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p: any) => !p.trashed && p.title && !p.title.startsWith("data:"))
            .map((p: any) => ({
              id: p.id,
              title: p.title || "Untitled",
              icon: p.icon || "📄",
            }));
        }
      }
    } catch {}
    return [
      { id: "current", title: "Current Page", icon: "📄" },
      { id: "notes", title: "Meeting Notes", icon: "🗓️" },
      { id: "tasks", title: "Tasks Tracker", icon: "✅" },
      { id: "brainstorm", title: "Brainstorm Session", icon: "💡" },
    ];
  }, []);

  const filteredMentions = useMemo(() => {
    const atMatch = prompt.match(/@(\w*)$/);
    const query = atMatch ? atMatch[1].toLowerCase() : "";
    return workspacePages.filter((p) => p.title.toLowerCase().includes(query));
  }, [prompt, workspacePages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss when clicking on blank space / outside the bar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", handleOutsideClick);
    }, 60);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [onClose]);

  // Animate loading text between Focusing -> Writing -> Polishing
  useEffect(() => {
    if (!loading) return;
    const stages = ["Focusing", "Writing with AI", "Polishing draft"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % stages.length;
      setLoadingText(stages[i]);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSelectMention = (mentionTitle: string) => {
    if (prompt.includes("@")) {
      setPrompt((prev) => prev.replace(/@\w*$/, `@${mentionTitle} `));
    } else {
      setPrompt((prev) => (prev ? `${prev} @${mentionTitle} ` : `@${mentionTitle} `));
    }
    setAttachedContexts((prev) => (prev.includes(mentionTitle) ? prev : [...prev, mentionTitle]));
    setMentionOpen(false);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const executeAI = async (customPromptText?: string) => {
    const activePrompt = (customPromptText || prompt).trim();
    if (!activePrompt) return;

    setLoading(true);
    setResult("");
    setMentionOpen(false);
    abortControllerRef.current = false;

    // Detect if the prompt is purely conversational / question
    const conversationalCheck = /^(hi|hello|hey|what is|how are you|who are you|explain|tell me about|why is|define)\b/i.test(activePrompt);
    setIsConversational(conversationalCheck);

    const contextAttachments = attachedContexts.length > 0 ? `\nReferenced Contexts: ${attachedContexts.join(", ")}` : "";
    const contextText = (blockText.trim() || pageContext.slice(0, 1000) || "Document") + contextAttachments;

    try {
      let output = "";
      try {
        output = await aiManager.send({
          prompt: activePrompt,
          system: conversationalCheck
            ? "You are a concise, helpful Notion AI assistant. Provide a direct, friendly, and accurate response without meta-commentary."
            : "You are Notion AI inside the Noska editor. Output only clean, helpful markdown content directly to replace or insert into the document. Do not output meta-commentary, explanations, context echoes, or greetings unless asked."
        });
      } catch {
        output = await runAI({
          provider: aiProvider,
          anthropicKey: apiKey,
          nvidiaKey: nvidiaKey,
          system: conversationalCheck
            ? "You are a concise, helpful Notion AI assistant. Provide a direct, friendly, and accurate response without meta-commentary."
            : "You are Notion AI inside the Noska editor. Output only clean, helpful markdown content directly to replace or insert into the document. Do not output meta-commentary, explanations, context echoes, or greetings unless asked.",
          prompt: `Instruction: ${activePrompt}\n\nContext:\n"${contextText}"`,
        });
      }

      if (!abortControllerRef.current) {
        // Strip any mock boilerplate if returned
        const cleaned = output
          .replace(/^##\s*AI\s*draft[\s\S]*?(?=\n\n|\n[A-Z#*-])/i, "")
          .replace(/^Context:\s*"[^"]*"\s*/i, "")
          .replace(/>\s*Generated locally[\s\S]*$/i, "")
          .trim();
        setResult(cleaned || "No content generated. Please try again with more details.");
      }
    } catch (err) {
      if (!abortControllerRef.current) {
        setResult(err instanceof Error ? `Error: ${err.message}` : "AI generation failed. Please check your provider settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current = true;
    setLoading(false);
  };

  const actions = [
    {
      id: "accept",
      label: "Accept",
      icon: Check,
      action: () => {
        onReplace(result);
        onClose();
      },
    },
    {
      id: "discard",
      label: "Discard",
      icon: X,
      action: () => {
        onClose();
      },
    },
    {
      id: "insert-below",
      label: "Insert below",
      icon: Rows,
      action: () => {
        onInsertBelow(result);
        onClose();
      },
    },
    {
      id: "try-again",
      label: "Try again",
      icon: RotateCcw,
      action: () => {
        executeAI();
      },
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      if (mentionOpen) {
        setMentionOpen(false);
      } else {
        onClose();
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mentionOpen && filteredMentions.length > 0) {
        handleSelectMention(filteredMentions[selectedMentionIndex]?.title || filteredMentions[0].title);
      } else if (result) {
        actions[selectedActionIndex]?.action();
      } else if (prompt.trim()) {
        executeAI();
      }
    } else if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredMentions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
      }
    } else if (result && e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedActionIndex((prev) => (prev + 1) % actions.length);
    } else if (result && e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedActionIndex((prev) => (prev - 1 + actions.length) % actions.length);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);
    if (/@\w*$/.test(val)) {
      setMentionOpen(true);
      setSelectedMentionIndex(0);
    } else if (!val.includes("@") && mentionOpen) {
      setMentionOpen(false);
    }
  };

  const content = (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, scale: 0.98, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      transition={{ type: "spring", damping: 30, stiffness: 440 }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[9999] w-[640px] max-w-[calc(100vw-32px)] font-sans select-none"
      style={{
        top: Math.max(12, Math.min(position.top, window.innerHeight - 260)),
        left: Math.max(16, Math.min(position.left, window.innerWidth - 660)),
      }}
    >
      <div className="flex flex-col gap-2">
        {/* ── Generated Text In-Place Ghost Preview (Matching Reference Image) ── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.99 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 p-3.5 shadow-sm select-text"
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="max-h-[300px] overflow-y-auto scroll-smooth overscroll-contain text-[14px] leading-relaxed text-[#1e40af] dark:text-[#93c5fd] font-normal whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-blue-300/80 dark:scrollbar-thumb-blue-700/80 pr-1.5"
              >
                {result}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── @ Mention Context Popup Menu ── */}
        <AnimatePresence>
          {mentionOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 420 }}
              className="w-72 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e22] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-black/5 dark:border-white/5">
                <span className="text-[10.5px] font-bold text-slate-400 dark:text-zinc-500 tracking-wider uppercase">
                  Reference Page or Context
                </span>
                <button
                  type="button"
                  onClick={() => setMentionOpen(false)}
                  className="h-5 w-5 grid place-items-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5 pt-1">
                {filteredMentions.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectMention(p.title)}
                    onMouseEnter={() => setSelectedMentionIndex(idx)}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      selectedMentionIndex === idx
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <PageIcon icon={p.icon} size={15} fallback="📄" />
                    <span className="truncate flex-1">{p.title}</span>
                  </button>
                ))}
                {filteredMentions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-400 italic">No matching pages found</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Notion Pill Capsule AI Input Bar ── */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex items-center gap-2.5 px-3.5 py-2 h-[46px] rounded-full bg-white dark:bg-[#1b1b1e] text-[#1c1b18] dark:text-[#f4f4f5] border border-black/10 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.6)] cursor-text transition-all"
        >
          {/* Avatar Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 text-sm overflow-hidden border border-black/5 dark:border-white/10 select-none">
            {loading ? (
              <Loader2 size={14} className="animate-spin text-amber-500" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
                <circle cx="15" cy="9" r="1" fill="currentColor" />
              </svg>
            )}
          </div>

          {/* Center Input / Loading Indicator */}
          {loading ? (
            <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 select-none">
              <span>{loadingText}</span>
              <span className="inline-block animate-pulse">...</span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Ask, search, write anything..."
              style={{
                outline: "none",
                border: "none",
                boxShadow: "none",
                background: "transparent",
              }}
              className="flex-1 bg-transparent text-[13px] text-[#1c1b18] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#71717a] border-none outline-none ring-0 shadow-none focus:outline-none focus:border-none focus:ring-0 focus:shadow-none select-text cursor-text"
            />
          )}

          {/* Right Action Icons: @ Mention & Submit Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMentionOpen((prev) => !prev);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer ${
                mentionOpen
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-slate-400 hover:text-slate-700 dark:text-[#71717a] dark:hover:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
              title="Reference page or context (@)"
            >
              <AtSign size={13} />
            </button>

            {loading ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStop();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 dark:bg-white/15 hover:bg-black/20 dark:hover:bg-white/25 text-black dark:text-white transition cursor-pointer"
                title="Stop generation"
              >
                <Square size={9} className="fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeAI();
                }}
                disabled={!prompt.trim()}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer ${
                  prompt.trim()
                    ? "bg-[#1c1b18] text-white dark:bg-white dark:text-black hover:opacity-90 shadow-sm"
                    : "bg-slate-100 text-slate-400 dark:bg-white/[0.08] dark:text-[#71717a]"
                }`}
                title="Send to AI (Enter)"
              >
                <ArrowUp size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* ── Notion Action Menu (Accept / Discard / Insert Below / Try Again) ── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 420 }}
              className="w-48 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e22] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {actions.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedActionIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedActionIndex(idx)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-slate-100 dark:bg-white/10 text-[#1c1b18] dark:text-white font-medium"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon size={13} className={isSelected ? "text-blue-500 dark:text-blue-400" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
