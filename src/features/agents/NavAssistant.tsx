import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowUp, X, Sparkles, Terminal, MessageSquare, Loader2 } from "lucide-react";

interface NavAssistantProps {
  onToast?: (message: string) => void;
  pages: any[];
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
}

export default function NavAssistant({ onToast, pages, apiKey, aiProvider, nvidiaKey }: NavAssistantProps) {
  const [inputValue, setInputValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  const skills = [
    { label: "Summarize active page", prompt: "Summarize the active page content in 3 key takeaways." },
    { label: "Find Action Items", prompt: "Identify all checklist or action items on the page and summarize them." },
    { label: "Improve Writing", prompt: "How can I improve the tone and structure of the active page to make it more professional? Be specific." },
  ];

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer("");
    setShowAnswer(true);
    setShowMenu(false);
    setInputValue("");

    try {
      // Dynamic import to avoid circular dependency issues
      const { runAI } = await import("../../utils/ai");
      const activeContent = pages[0]?.blocks?.map((b: any) => b.text).join("\n") || "No content available.";
      const result = await runAI({
        provider: aiProvider || "anthropic",
        anthropicKey: apiKey,
        nvidiaKey,
        system:
          "You are Noska NavAssistant. Be direct, concise, and helpful (maximum 2-3 sentences). Answer questions about the workspace page or general topics.",
        prompt: `Page content:\n${activeContent}\n\nUser request: ${text}`,
      });
      setAnswer(result);
    } catch (e: any) {
      setAnswer(`Could not generate a response. ${e?.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--accent)]" /> NavAssistant Playground
        </h3>
        <p className="text-[10px] text-[var(--muted)] mt-0.5">
          Test your agent's skills and query page context dynamically.
        </p>
      </div>

      {/* Answer Panel */}
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 relative"
          >
            <button
              onClick={() => { setShowAnswer(false); setAnswer(""); }}
              className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X size={14} />
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 flex items-center gap-1.5">
              <MessageSquare size={10} /> Response
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] py-2">
                <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                Thinking…
              </div>
            ) : (
              <p className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap">{answer}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div className="relative">
        {/* Menu Overlay */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full mb-2 left-0 right-0 bg-[var(--panel)] border border-[var(--border-strong)] rounded-xl p-3 shadow-lg z-20 space-y-1"
            >
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] px-2 mb-1">
                Quick Skills
              </div>
              {skills.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.prompt)}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--secondary)] flex items-center gap-2 cursor-pointer border-none bg-transparent transition"
                >
                  <Terminal size={11} className="text-[var(--accent)] shrink-0" />
                  {s.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-full px-3 py-2">
          {/* Menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="h-8 w-8 rounded-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--hover)] flex items-center justify-center cursor-pointer transition shrink-0"
          >
            <Plus
              size={16}
              className={`transition-transform duration-200 ${showMenu ? "rotate-45" : ""}`}
            />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend(inputValue);
            }}
            placeholder="Ask anything or request page analysis…"
            className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text)] placeholder:text-[var(--muted)] px-1"
          />

          {/* Send button */}
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim()}
            className="h-8 w-8 rounded-full bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center cursor-pointer transition shadow-sm shrink-0"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
