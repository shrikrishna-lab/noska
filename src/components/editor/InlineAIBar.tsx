import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { runAI } from "../../utils/ai";

interface InlineAIBarProps {
  text: string;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  style?: React.CSSProperties;
  onClose?: () => void;
  onResult: (result: string) => void;
}

export default function InlineAIBar({ text, apiKey, aiProvider, nvidiaKey, style, onClose, onResult }: InlineAIBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: MouseEvent | PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const response = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey,
        system: "You are an AI writing assistant. Given the context before the cursor and a user request, provide the output directly without explanations.",
        prompt: `Context: "${text}"\n\nUser request: ${prompt}\n\nOutput:`
      });
      onResult(response);
    } catch {
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={style}
      className="fixed z-[150] flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--elevated)] px-3 py-2 shadow-2xl"
    >
      <span className="text-[10px] font-semibold text-[var(--accent)] shrink-0">AI</span>
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose?.(); }}
        placeholder={`Edit, expand, or rewrite "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}"`}
        className="flex-1 min-w-0 bg-transparent px-2 py-1 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-40 cursor-pointer"
      >
        {loading ? "..." : "Send"}
      </button>
    </motion.div>
  );
}
