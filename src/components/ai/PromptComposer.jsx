import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendHorizontal, StopCircle, Sparkles, Plus, Globe, SlidersHorizontal } from 'lucide-react';
import { realtimeCollab } from '../../lib/realtimeCollab';

export default function PromptComposer({
  prompt, setPrompt, onSend, loading, onAbort,
  currentAgent, page, showSettings, onToggleSettings
}) {
  const textareaRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [prompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loading) onAbort?.();
      else onSend?.();
    }
    if (e.key === 'Escape') {
      setFocused(false);
      textareaRef.current?.blur();
    }
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className={`mx-3 my-2.5 rounded-xl border transition-all duration-200 ${
        focused ? 'border-[var(--accent)]/40 shadow-[0_0_0_1px_var(--accent-alpha)]' : 'border-[var(--border)]'
      } bg-[var(--surface)]`}>
        {/* Toolbar row */}
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-1">
          {currentAgent && (
            <span className="flex items-center gap-1 rounded-md bg-[var(--accent)]/8 px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent)]">
              <Sparkles size={8} />
              {currentAgent.name}
            </span>
          )}
          {page && (
            <span className="flex items-center gap-1 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">
              <Globe size={8} />
              {page.title?.slice(0, 20)}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={onToggleSettings}
            className={`p-1 rounded text-[9px] transition ${showSettings ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'}`}
            title="Prompt settings"
          >
            <SlidersHorizontal size={10} />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (page?.id && realtimeCollab.isJoined()) realtimeCollab.sendTyping(page.id);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] leading-relaxed"
          placeholder={`Ask ${currentAgent?.name || 'Noska'} to write, search, or edit...`}
        />

        {/* Bottom row */}
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <button
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
            title="Attach"
          >
            <Plus size={11} />
          </button>
          <div className="flex-1" />
          {loading ? (
            <button
              onClick={onAbort}
              className="flex items-center gap-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 text-[10px] font-medium transition"
            >
              <StopCircle size={10} />
              Stop
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!prompt.trim()}
              className="flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-30 px-2 py-1 text-[10px] font-medium transition"
            >
              <SendHorizontal size={10} />
              Send
            </button>
          )}
        </div>
      </div>

      {/* Token/usage bar */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 pb-2"
          >
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '100ms'}} />
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '200ms'}} />
            </div>
            <span className="text-[9px] text-[var(--muted)]">{currentAgent?.name || 'AI'} is thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
