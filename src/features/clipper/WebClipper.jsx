import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Scissors,
  Globe,
  Sparkles,
  ArrowRight,
  X,
  Link2,
  FileText,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste
} from "lucide-react";
import { uid, now, blockFor } from "../../utils/helpers";
import { runAI } from "../../utils/ai";
import { storageApi } from "../../utils/storage";

/* ─── text → blocks converter ─── */

function textToBlocks(text) {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      if (line.startsWith("### ")) return blockFor("h3", line.replace("### ", ""));
      if (line.startsWith("## ")) return blockFor("h2", line.replace("## ", ""));
      if (line.startsWith("# ")) return blockFor("h1", line.replace("# ", ""));
      if (/^[-•*]\s/.test(line)) return blockFor("bullet", line.replace(/^[-•*]\s/, ""));
      if (/^\d+\.\s/.test(line)) return blockFor("number", line.replace(/^\d+\.\s/, ""));
      if (line.startsWith("> ")) return blockFor("quote", line.replace("> ", ""));
      return blockFor("text", line);
    });
}

/* ─── main component ─── */

export default function WebClipper({
  onClose,
  onAppendBlocks,
  apiKey,
  aiProvider,
  nvidiaKey,
  onToast,
  pageTitle
}) {
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [mode, setMode] = useState("paste"); // "paste" | "url"
  const [loading, setLoading] = useState(false);
  const [digestLoading, setDigestLoading] = useState(false);
  const [clipHistory, setClipHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  // Handle Escape key close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load clip history from storage
  useEffect(() => {
    (async () => {
      const store = storageApi();
      const saved = await store.get("clipHistory");
      if (saved.value) setClipHistory(JSON.parse(saved.value));
    })();
  }, []);

  // Save clip history
  const saveHistory = async (history) => {
    const store = storageApi();
    await store.set("clipHistory", JSON.stringify(history.slice(0, 20)));
  };

  const addToHistory = (entry) => {
    const next = [{ ...entry, id: uid(), clippedAt: now() }, ...clipHistory].slice(0, 20);
    setClipHistory(next);
    saveHistory(next);
  };

  const removeFromHistory = (id) => {
    const next = clipHistory.filter((c) => c.id !== id);
    setClipHistory(next);
    saveHistory(next);
  };

  const handleClip = () => {
    const content = mode === "paste" ? pastedText.trim() : url.trim();
    if (!content) return;

    const blocks = textToBlocks(content);
    const source = mode === "url" ? url : "Clipboard paste";

    // Add a source callout at the top
    const sourceBlock = blockFor("callout", `Clipped from: ${source}`);
    sourceBlock.meta = { tone: "info", icon: "📎" };

    onAppendBlocks([sourceBlock, ...blocks]);
    addToHistory({ source, preview: content.slice(0, 120), blockCount: blocks.length });
    onToast?.(`Clipped ${blocks.length} blocks to page`);
    setPastedText("");
    setUrl("");
  };

  const handleAIDigest = async () => {
    const content = mode === "paste" ? pastedText.trim() : url.trim();
    if (!content) return;

    setDigestLoading(true);
    try {
      const result = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey,
        system: "You are a note-taking assistant. Summarize the following content into a concise, well-structured digest. Use headings (## ), bullet points (- ), and key takeaways. Keep it brief and actionable.",
        prompt: `Summarize this content:\n\n${content.slice(0, 3000)}`
      });

      const blocks = textToBlocks(result);
      const digestBlock = blockFor("callout", "AI Digest");
      digestBlock.meta = { tone: "tip", icon: "✦" };

      onAppendBlocks([digestBlock, ...blocks]);
      addToHistory({
        source: mode === "url" ? url : "AI Digest",
        preview: result.slice(0, 120),
        blockCount: blocks.length,
        isDigest: true
      });
      onToast?.("AI digest added to page");
      setPastedText("");
      setUrl("");
    } catch (err) {
      onToast?.("AI digest failed");
    } finally {
      setDigestLoading(false);
    }
  };

  const timeAgoShort = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[560px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Scissors size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Web Clipper</h2>
          <span className="text-xs text-[var(--muted)]">→ {pageTitle || "Current page"}</span>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 border-b border-[var(--border)] px-5 py-2">
          <button
            onClick={() => setMode("paste")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "paste" ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)] hover:text-[var(--text)]"
            }`}
          >
            <ClipboardPaste size={13} />
            Paste text
          </button>
          <button
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "url" ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)] hover:text-[var(--text)]"
            }`}
          >
            <Link2 size={13} />
            URL
          </button>
        </div>

        {/* Input area */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin" style={{ maxHeight: "300px" }}>
          {mode === "paste" ? (
            <textarea
              ref={inputRef}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste any text, article, or notes here...\n\nTip: Copy from any webpage and paste here."
              className="w-full h-40 resize-none rounded-lg bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--text)] outline-none placeholder:text-[var(--muted)] scrollbar-thin"
              autoFocus
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2">
                <Globe size={15} className="shrink-0 text-[var(--muted)]" />
                <input
                  ref={inputRef}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article..."
                  className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                The URL will be saved as a reference. Paste the article content above for best results.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--secondary)]"
          >
            <Clock size={12} />
            History ({clipHistory.length})
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <div className="flex-1" />
          <motion.button
            onClick={handleAIDigest}
            disabled={digestLoading || (!pastedText.trim() && !url.trim())}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40"
          >
            <Sparkles size={13} className={digestLoading ? "animate-spin" : ""} />
            {digestLoading ? "Digesting..." : "AI Digest"}
          </motion.button>
          <motion.button
            onClick={handleClip}
            disabled={!pastedText.trim() && !url.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-40"
          >
            <ArrowRight size={13} />
            Clip to Page
          </motion.button>
        </div>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && clipHistory.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_PRESETS.soft}
              className="overflow-hidden border-t border-[var(--border)]"
            >
              <div className="max-h-40 overflow-y-auto p-3 scrollbar-thin space-y-1">
                {clipHistory.map((clip) => (
                  <div key={clip.id} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-[var(--hover)] group">
                    {clip.isDigest ? (
                      <Sparkles size={12} className="shrink-0 text-[var(--accent)]" />
                    ) : (
                      <FileText size={12} className="shrink-0 text-[var(--muted)]" />
                    )}
                    <span className="flex-1 truncate text-[var(--secondary)]">{clip.preview}</span>
                    <span className="shrink-0 text-[var(--muted)]">{clip.blockCount}b</span>
                    <span className="shrink-0 text-[var(--muted)]">{timeAgoShort(clip.clippedAt)}</span>
                    <button
                      onClick={() => removeFromHistory(clip.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-400 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
