import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Bold, Italic, Underline, Code, Link, MoreHorizontal, Smile, MessageCircle, Highlighter,
  SlidersHorizontal, ChevronDown, ChevronLeft, Star, Heart, ThumbsUp, Flag, Bell, Bookmark,
  Lightbulb, Target, Zap, Check, Clock, AlertCircle, HelpCircle, Loader2
} from "lucide-react";
import { BlockRegistry } from "../../registry/BlockRegistry";
import { runAI } from "../../utils/ai";
import { blockFor, uid } from "../../utils/helpers";
import { TEXT_COLORS, BG_COLORS } from "../../utils/colors";

export default function SelectionAIBar({ selection, apiKey, aiProvider, nvidiaKey, onFormat,
onReplace, onInsert, onClose, onToast, page, onBlockPatch, onPagePatch }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [subView, setSubView] = useState("main");
  const [colorTab, setColorTab] = useState("text");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const barRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    if (!selection?.text) return;
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [selection?.text, onClose]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [emojiOpen]);

  if (!selection || !selection.text) return null;

  const handleAIAction = async (promptText) => {
    setLoading(true);
    setResult("");
    try {
      const response = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey: nvidiaKey,
        system: "You are an expert AI editor inside the Noska note-taking workspace. Provide only the polished/requested text back directly without any conversational intros or formatting wraps.",
        prompt: `${promptText}\n\nSelected text:\n"${selection.text}"`
      });
      setResult(response);
    } catch (e) {
      setResult("AI request failed. Confirm your key is added in Settings.");
    } finally {
      setLoading(false);
    }
  };

  const currentBlock = page?.blocks?.find(b => b.id === selection.blockId);
  const blockTypeLabel = currentBlock
    ? BlockRegistry.find(r => r.type === currentBlock.type)?.label || "Normal Text"
    : "Normal Text";

  const handleBlockConvert = (typeId) => {
    if (selection.blockId && currentBlock) {
      onBlockPatch(selection.blockId, { ...blockFor(typeId, currentBlock.text), id: selection.blockId });
      onToast?.(`Converted block to ${typeId}`);
    }
    setSubView("main");
  };

  const rect = selection.rect;
  const barWidth = 270;
  const barHeight = 360;
  let top = Math.max(10, rect.top - barHeight);
  if (top < 10) top = Math.min(rect.bottom + 10, window.innerHeight - barHeight - 10);
  let left = Math.min(window.innerWidth - barWidth - 16, Math.max(16, rect.left + rect.width / 2 - barWidth / 2));
  if (left + barWidth > window.innerWidth - 16) left = window.innerWidth - barWidth - 16;

  return (
    <div
      ref={barRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="absolute z-[150] rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] p-2.5 shadow-2xl selection-toolbar flex flex-col gap-2 w-[270px] select-none"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {!result && !loading ? (
        <>
          {subView === "main" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1 px-1">
                <button
                  onClick={() => setSubView("turn-into")}
                  className="text-[11px] font-semibold text-[var(--secondary)] flex items-center gap-1 cursor-pointer hover:text-white"
                >
                  {blockTypeLabel} <ChevronDown size={11} />
                </button>
              </div>

              <div className="flex items-center justify-between px-1">
                <button
                  onClick={() => setSubView("color")}
                  className="p-1 rounded hover:bg-[var(--hover)] text-xs text-[var(--secondary)] cursor-pointer"
                  title="Text color"
                >
                  <span className="font-bold underline text-[var(--accent)] decoration-[var(--accent)]">A</span>
                </button>
                <button onClick={() => onFormat("bold")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Bold">
                  <Bold size={13} />
                </button>
                <button onClick={() => onFormat("italic")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Italic">
                  <Italic size={13} />
                </button>
                <button onClick={() => onFormat("underline")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Underline">
                  <Underline size={13} />
                </button>
                <button onClick={() => onFormat("clear")} className="p-1 rounded hover:bg-[var(--hover)] text-xs text-[var(--secondary)] font-semibold cursor-pointer" title="Clear formatting">
                  Tx
                </button>
              </div>

              <div className="flex items-center justify-between px-1 border-b border-[var(--border)] pb-1.5">
                <button onClick={() => {
                  const url = window.prompt("Enter hyperlink URL:");
                  if (url) {
                    const targetBlock = selection.text;
                    onReplace(`[${targetBlock}](${url})`);
                  }
                }} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Add Link">
                  <Link size={13} />
                </button>
                <button onClick={() => onFormat("strikethrough")} className="p-1 rounded hover:bg-[var(--hover)] text-xs font-semibold line-through text-[var(--secondary)] cursor-pointer" title="Strikethrough">
                  S
                </button>
                <button onClick={() => onFormat("code")} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Code block">
                  <Code size={13} />
                </button>
                <button onClick={() => {
                  const equation = window.prompt("Enter LaTeX equation formula:");
                  if (equation) onReplace(`$$${equation}$$`);
                }} className="p-1 rounded hover:bg-[var(--hover)] text-xs font-bold font-mono text-[var(--secondary)] cursor-pointer" title="Inline Math">
                  √x
                </button>
                <button
                  onClick={() => setSubView("more")}
                  className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"
                  title="More options"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between px-1 border-b border-[var(--border)] pb-1.5">
                <button onClick={() => {
                  if (selection.blockId && page?.id) {
                    const existing = page.comments || [];
                    const comment = {
                      id: uid(),
                      blockId: selection.blockId,
                      pageId: page.id,
                      text: selection.text || "Selected text",
                      userId: "local",
                      userName: "You",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      resolvedAt: null,
                      resolvedBy: null
                    };
                    onPagePatch?.({ comments: [...existing, comment] });
                    onToast?.("Comment added");
                    setTimeout(() => { onClose?.(); }, 100);
                  }
                }} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--hover)] text-[10px] text-[var(--secondary)] cursor-pointer">
                  <MessageCircle size={12} /> Comment
                </button>
                <div className="relative" ref={emojiRef}>
                  <button onClick={() => setEmojiOpen(!emojiOpen)} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Smile emoji">
                    <Smile size={13} />
                  </button>
                  {emojiOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 grid grid-cols-5 gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] p-2 shadow-2xl z-[160] w-[170px]">
                      <button onClick={() => { onReplace('📝'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📝</button>
                      <button onClick={() => { onReplace('📌'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📌</button>
                      <button onClick={() => { onReplace('🧠'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🧠</button>
                      <button onClick={() => { onReplace('🚀'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🚀</button>
                      <button onClick={() => { onReplace('📚'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">📚</button>
                      <button onClick={() => { onReplace('🗓️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🗓️</button>
                      <button onClick={() => { onReplace('🔖'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-sm cursor-pointer">🔖</button>
                      <button onClick={() => { onReplace('⭐'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Star size={13} /></button>
                      <button onClick={() => { onReplace('❤️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Heart size={13} /></button>
                      <button onClick={() => { onReplace('👍'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><ThumbsUp size={13} /></button>
                      <button onClick={() => { onReplace('🚩'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Flag size={13} /></button>
                      <button onClick={() => { onReplace('🔔'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Bell size={13} /></button>
                      <button onClick={() => { onReplace('🔖'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Bookmark size={13} /></button>
                      <button onClick={() => { onReplace('💡'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Lightbulb size={13} /></button>
                      <button onClick={() => { onReplace('🎯'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Target size={13} /></button>
                      <button onClick={() => { onReplace('⚡'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Zap size={13} /></button>
                      <button onClick={() => { onReplace('✅'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Check size={13} /></button>
                      <button onClick={() => { onReplace('🕐'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><Clock size={13} /></button>
                      <button onClick={() => { onReplace('⚠️'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><AlertCircle size={13} /></button>
                      <button onClick={() => { onReplace('❓'); setEmojiOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer"><HelpCircle size={13} /></button>
                    </div>
                  )}
                </div>
                <button onClick={() => onBlockPatch(selection.blockId, { bgColor: '#ffeb3b33' })} className="p-1 rounded hover:bg-[var(--hover)] text-[var(--secondary)] cursor-pointer" title="Marker highlight">
                  <Highlighter size={13} />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-wider text-[var(--muted)] px-1">
                  <span>Skills</span>
                  <div className="flex items-center gap-1 text-[var(--muted)]">
                    <SlidersHorizontal size={10} />
                    <span>▲ ▼</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAIAction("Improve writing, flow, and vocabulary:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  ✨ Improve writing
                </button>
                <button
                  onClick={() => handleAIAction("Proofread the following text for spelling, punctuation, and grammar mistakes:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  ✓ Proofread
                </button>
                <button
                  onClick={() => handleAIAction("Explain the meaning and context of this text:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  💡 Explain
                </button>
                <button
                  onClick={() => handleAIAction("Reformat this text into a clean professional paragraph:")}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer font-medium"
                >
                  📝 Reformat
                </button>
              </div>

              <div className="relative mt-1 border-t border-[var(--border)] pt-2 px-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiPrompt.trim()) {
                      handleAIAction(aiPrompt.trim());
                    }
                  }}
                  placeholder="Edit with AI"
                  className="w-full bg-[var(--surface)] rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/3 text-[8px] text-[var(--muted)] font-mono font-semibold pointer-events-none select-none">
                  Alt+⇧+E
                </span>
              </div>
            </div>
          )}

          {subView === "more" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">More formatting</span>
              </div>
              <button
                onClick={() => { onFormat("strikethrough"); setSubView("main"); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <span className="text-xs font-semibold line-through">S</span> Strikethrough
              </button>
              <button
                onClick={() => { onFormat("code"); setSubView("main"); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <Code size={13} /> Code Block
              </button>
              <button
                onClick={() => {
                  const val = window.prompt("Enter LaTeX equation formula:");
                  if (val) onReplace(`$$${val}$$`);
                  setSubView("main");
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
              >
                <span className="font-mono text-xs font-bold">√x</span> Inline Math Equation
              </button>
              <button
                onClick={() => setSubView("color")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold underline text-[var(--accent)]">A</span> Colors & Highlights
                </span>
                <ChevronDown size={11} className="-rotate-90 text-[var(--muted)]" />
              </button>
            </div>
          )}

          {subView === "color" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1 max-h-[340px] overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">Colors & Highlights</span>
              </div>
              <div className="flex items-center gap-1 px-1 mb-1">
                <button
                  onClick={() => setColorTab("text")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition cursor-pointer ${
                    colorTab === "text" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setColorTab("bg")}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition cursor-pointer ${
                    colorTab === "bg" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Background
                </button>
              </div>
              <div className="flex items-center gap-2 px-1 mb-1">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-7 h-7 rounded border border-[var(--border)] cursor-pointer p-0 bg-transparent"
                />
                <button
                  onClick={() => {
                    if (selection.blockId) {
                      if (colorTab === "bg") {
                        onBlockPatch(selection.blockId, { bgColor: customColor });
                        onToast?.("Block background color set to custom");
                      } else {
                        onBlockPatch(selection.blockId, { color: customColor });
                        onToast?.("Block text color set to custom");
                      }
                    }
                    setSubView("main");
                  }}
                  className="flex-1 py-1 text-[10px] font-semibold text-[var(--secondary)] bg-[var(--hover)] hover:bg-[var(--surface-3)] rounded transition cursor-pointer"
                >
                  Apply custom color
                </button>
              </div>
              {(colorTab === "text" ? TEXT_COLORS : BG_COLORS).map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    if (selection.blockId) {
                      if (c.name === "Default" || c.name === "None") {
                        if (colorTab === "bg") {
                          const { bgColor, ...rest } = currentBlock || {};
                          onBlockPatch(selection.blockId, rest);
                        } else {
                          const { color, ...rest } = currentBlock || {};
                          onBlockPatch(selection.blockId, rest);
                        }
                      } else {
                        const patch = colorTab === "bg" ? { bgColor: c.name.toLowerCase() } : { color: c.name.toLowerCase() };
                        onBlockPatch(selection.blockId, patch);
                      }
                      onToast?.(`${colorTab === "bg" ? "Background" : "Text"} color set to ${c.name}`);
                    }
                    setSubView("main");
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-[var(--border)]" style={{ backgroundColor: c.value }}>
                    <span className="text-[9px] font-bold text-[#111]">T</span>
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {subView === "turn-into" && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 py-1 max-h-[300px] overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1.5 mb-1 px-1">
                <button onClick={() => setSubView("main")} className="p-0.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-white transition cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-[var(--secondary)]">Turn block into...</span>
              </div>
              {[
                { id: "text", label: "Text" },
                { id: "h1", label: "Heading 1" },
                { id: "h2", label: "Heading 2" },
                { id: "h3", label: "Heading 3" },
                { id: "bullet", label: "Bullet list" },
                { id: "number", label: "Numbered list" },
                { id: "todo", label: "To-do list" },
                { id: "quote", label: "Quote" },
                { id: "callout", label: "Callout" },
                { id: "code", label: "Code Block" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleBlockConvert(t.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)] rounded transition cursor-pointer"
                >
                  📄 {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
            <span className="text-[9px] uppercase font-semibold text-[var(--muted)]">AI Response</span>
            <button onClick={() => { setResult(""); setLoading(false); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">✕ Reset</button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-[var(--secondary)]">
              <Loader2 className="animate-spin" size={14} />
              <span>YoYo is writing...</span>
            </div>
          ) : (
            <div className="text-xs text-[var(--text)] max-h-48 overflow-y-auto scrollbar-thin bg-[var(--bg)]/20 p-2 rounded border border-[var(--border)] leading-relaxed">
              {result}
            </div>
          )}
          {!loading && result && (
            <div className="flex gap-1.5 justify-end mt-1 border-t border-[var(--border)] pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  onToast?.("AI result copied to clipboard!");
                }}
                className="rounded bg-[var(--surface)] border border-[var(--border-strong)] px-2 py-1 text-[10px] font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                Copy
              </button>
              <button
                onClick={() => onReplace(result)}
                className="rounded bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-2.5 py-1 text-[10px] font-semibold text-white transition cursor-pointer"
              >
                Replace
              </button>
              <button
                onClick={() => onInsert(result)}
                className="rounded bg-[var(--surface)] border border-[var(--border-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                Insert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
